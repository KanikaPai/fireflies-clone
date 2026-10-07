"""Phase 5: bulk delete, segment edits, find & replace, speaker reassignment, privacy and shares."""

from sqlalchemy import text

from app.db import SessionLocal


def _meeting(client, q="sprint"):
    mid = client.get("/api/meetings", params={"q": q}).json()["items"][0]["id"]
    return client.get(f"/api/meetings/{mid}").json()


def _segments(client, mid):
    return client.get(f"/api/meetings/{mid}/transcript").json()["segments"]


def _count(sql, **params):
    with SessionLocal() as db:
        return db.execute(text(sql), params).scalar_one()


# --- static routes are not shadowed by /{id} -----------------------------------------------------


def test_static_routes_are_reachable(client):
    assert client.post("/api/meetings/bulk-delete", json={"ids": [999999]}).status_code == 404  # not 405/422 from /{id}
    assert client.patch("/api/segments/999999", json={"text": "x"}).status_code == 404
    mid = _meeting(client)["id"]
    assert client.get(f"/api/meetings/{mid}/shares").status_code == 200
    assert client.post(f"/api/meetings/{mid}/transcript/replace", json={"find": "zzzqqq", "replace": "x"}).status_code == 200


# --- bulk delete ---------------------------------------------------------------------------------


def test_bulk_delete_removes_meetings_and_all_children(client):
    items = client.get("/api/meetings").json()["items"]
    ids = [items[0]["id"], items[1]["id"]]
    client.post(f"/api/meetings/{ids[0]}/shares", json={"email": "a@b.co"})
    total = client.get("/api/meetings").json()["total"]
    r = client.post("/api/meetings/bulk-delete", json={"ids": ids + ids})  # duplicates are collapsed
    assert r.status_code == 200 and r.json() == {"deleted": 2}
    assert client.get("/api/meetings").json()["total"] == total - 2
    assert client.get(f"/api/meetings/{ids[0]}").status_code == 404
    for table in ("transcript_segments", "summaries", "chapters", "action_items", "meeting_shares", "meeting_participants"):
        assert _count(f"SELECT COUNT(*) FROM {table} WHERE meeting_id IN ({ids[0]}, {ids[1]})") == 0, table
    # the FTS index has no rows left for the deleted segments
    assert _count("SELECT COUNT(*) FROM transcript_fts") == _count("SELECT COUNT(*) FROM transcript_segments")


def test_bulk_delete_is_all_or_nothing_and_validates(client):
    first = client.get("/api/meetings").json()["items"][0]["id"]
    assert client.post("/api/meetings/bulk-delete", json={"ids": [first, 424242]}).status_code == 404
    assert client.get(f"/api/meetings/{first}").status_code == 200  # nothing was deleted
    assert client.post("/api/meetings/bulk-delete", json={"ids": []}).status_code == 422
    assert client.post("/api/meetings/bulk-delete", json={}).status_code == 422


def test_single_delete_leaves_no_orphans(client):
    meeting = _meeting(client)
    client.post(f"/api/meetings/{meeting['id']}/shares", json={"email": "x@y.io"})
    assert client.delete(f"/api/meetings/{meeting['id']}").status_code == 204
    for table in ("transcript_segments", "summaries", "chapters", "action_items", "meeting_shares", "meeting_tags"):
        assert _count(f"SELECT COUNT(*) FROM {table} WHERE meeting_id = :m", m=meeting["id"]) == 0, table
    assert _count("SELECT COUNT(*) FROM transcript_fts") == _count("SELECT COUNT(*) FROM transcript_segments")


# --- segment edits ------------------------------------------------------------------------------


def test_edit_segment_text_updates_global_search(client):
    meeting = _meeting(client)
    segment = _segments(client, meeting["id"])[2]
    url = f"/api/segments/{segment['id']}"
    old_word, new_word = "xylophonic", "marimbaesque"
    assert client.get("/api/search", params={"q": old_word}).json()["results"] == []
    r = client.patch(url, json={"text": f"  Now we discuss {old_word} things.  "})
    assert r.status_code == 200 and r.json()["text"] == f"Now we discuss {old_word} things."
    assert r.json()["start_ms"] == segment["start_ms"] and r.json()["end_ms"] == segment["end_ms"]  # timings untouched
    hit = client.get("/api/search", params={"q": old_word}).json()
    assert hit["total_meetings"] == 1 and hit["results"][0]["meeting"]["id"] == meeting["id"]
    # editing again: the new wording is found and the old wording is gone from the index
    client.patch(url, json={"text": f"Now we discuss {new_word} things."})
    assert client.get("/api/search", params={"q": old_word}).json()["results"] == []
    assert client.get("/api/search", params={"q": new_word}).json()["total_meetings"] == 1
    in_meeting = client.get(f"/api/meetings/{meeting['id']}/transcript", params={"q": new_word}).json()
    assert in_meeting["matching_segment_ids"] == [segment["id"]]
    assert _count("SELECT COUNT(*) FROM transcript_fts") == _count("SELECT COUNT(*) FROM transcript_segments")


def test_edit_segment_validation(client):
    meeting = _meeting(client)
    segment = _segments(client, meeting["id"])[0]
    url = f"/api/segments/{segment['id']}"
    assert client.patch(url, json={"text": "   "}).status_code == 422
    assert client.patch(url, json={"text": ""}).status_code == 422
    assert client.patch(url, json={"speaker_id": 999999}).status_code == 422
    outsider = client.post("/api/people", json={"name": "Not In Meeting"}).json()["id"]
    assert client.patch(url, json={"speaker_id": outsider}).status_code == 422  # must be a participant
    assert client.patch(url, json={}).status_code == 200  # no-op
    assert client.get(f"/api/meetings/{meeting['id']}/transcript").json()["segments"][0]["text"] == segment["text"]


def test_change_segment_speaker_and_insights_follow(client):
    meeting = _meeting(client)
    mid = meeting["id"]
    segments = _segments(client, mid)
    before = {s["person"]["id"]: s for s in client.get(f"/api/meetings/{mid}/insights").json()["speakers"]}
    target = segments[0]
    other = next(p["id"] for p in meeting["participants"] if p["id"] != target["speaker"]["id"])
    r = client.patch(f"/api/segments/{target['id']}", json={"speaker_id": other})
    assert r.status_code == 200 and r.json()["speaker"]["id"] == other
    after = {s["person"]["id"]: s for s in client.get(f"/api/meetings/{mid}/insights").json()["speakers"]}
    assert after[target["speaker"]["id"]]["segment_count"] == before[target["speaker"]["id"]]["segment_count"] - 1
    assert after.get(other, {"segment_count": 0})["segment_count"] == before.get(other, {"segment_count": 0})["segment_count"] + 1


def test_edit_changes_insights_filters(client):
    meeting = _meeting(client)
    mid = meeting["id"]
    segment = _segments(client, mid)[1]
    questions = lambda: next(f for f in client.get(f"/api/meetings/{mid}/insights").json()["filters"] if f["key"] == "questions")  # noqa: E731
    assert segment["id"] not in questions()["segment_ids"] or "?" in segment["text"]
    client.patch(f"/api/segments/{segment['id']}", json={"text": "Can everyone hear me clearly right now?"})
    assert segment["id"] in questions()["segment_ids"]


# --- find & replace -----------------------------------------------------------------------------


def test_replace_is_literal_case_insensitive_and_counts_occurrences(client):
    mid = _meeting(client)["id"]
    segs = _segments(client, mid)
    marker = "wombat"
    client.patch(f"/api/segments/{segs[0]['id']}", json={"text": "Wombat WOMBAT wombat. a.b (c)"})
    client.patch(f"/api/segments/{segs[1]['id']}", json={"text": "No match here but a wombat there"})
    r = client.post(f"/api/meetings/{mid}/transcript/replace", json={"find": marker, "replace": "koala"})
    assert r.status_code == 200 and r.json() == {"replaced": 4, "segment_ids": [segs[0]["id"], segs[1]["id"]]}
    new = _segments(client, mid)
    assert new[0]["text"] == "koala koala koala. a.b (c)" and new[1]["text"].endswith("a koala there")
    assert client.get("/api/search", params={"q": marker}).json()["results"] == []
    assert client.get("/api/search", params={"q": "koala"}).json()["total_meetings"] == 1


def test_replace_treats_pattern_characters_literally(client):
    mid = _meeting(client)["id"]
    seg = _segments(client, mid)[0]
    client.patch(f"/api/segments/{seg['id']}", json={"text": "price is $5.00 (approx) for a.b and aXb"})
    r = client.post(f"/api/meetings/{mid}/transcript/replace", json={"find": "a.b", "replace": r"\1$&"})
    assert r.json()["replaced"] == 1  # "aXb" is not matched: '.' is not a wildcard
    assert _segments(client, mid)[0]["text"] == r"price is $5.00 (approx) for \1$& and aXb"
    r = client.post(f"/api/meetings/{mid}/transcript/replace", json={"find": "(approx)", "replace": "(exact)"})
    assert r.json()["replaced"] == 1


def test_replace_case_sensitive_and_segment_scope(client):
    mid = _meeting(client)["id"]
    a, b = _segments(client, mid)[:2]
    client.patch(f"/api/segments/{a['id']}", json={"text": "Zed zed"})
    client.patch(f"/api/segments/{b['id']}", json={"text": "zed"})
    r = client.post(f"/api/meetings/{mid}/transcript/replace", json={"find": "zed", "replace": "Q", "case_sensitive": True, "segment_ids": [a["id"]]})
    assert r.json() == {"replaced": 1, "segment_ids": [a["id"]]}
    new = _segments(client, mid)
    assert new[0]["text"] == "Zed Q" and new[1]["text"] == "zed"


def test_replace_validation_and_atomicity(client):
    mid = _meeting(client)["id"]
    segs = _segments(client, mid)
    url = f"/api/meetings/{mid}/transcript/replace"
    assert client.post(url, json={"find": "", "replace": "x"}).status_code == 422
    assert client.post("/api/meetings/999999/transcript/replace", json={"find": "a", "replace": "b"}).status_code == 404
    client.patch(f"/api/segments/{segs[0]['id']}", json={"text": "gone"})
    client.patch(f"/api/segments/{segs[1]['id']}", json={"text": "gone and more"})
    before = [s["text"] for s in _segments(client, mid)]
    assert client.post(url, json={"find": "gone", "replace": ""}).status_code == 422  # would empty segment 0
    assert [s["text"] for s in _segments(client, mid)] == before  # nothing changed


def test_replace_does_not_touch_other_meetings(client):
    a = _meeting(client, "sprint")["id"]
    b = _meeting(client, "q3 board")["id"]
    seg_b = _segments(client, b)[0]
    client.patch(f"/api/segments/{seg_b['id']}", json={"text": "unique-token-zz"})
    client.post(f"/api/meetings/{a}/transcript/replace", json={"find": "unique-token-zz", "replace": "changed"})
    assert _segments(client, b)[0]["text"] == "unique-token-zz"


# --- speaker reassignment -----------------------------------------------------------------------


def test_reassign_all_segments_of_a_speaker(client):
    meeting = _meeting(client)
    mid = meeting["id"]
    segs = _segments(client, mid)
    from_id = segs[0]["speaker"]["id"]
    to_id = next(p["id"] for p in meeting["participants"] if p["id"] != from_id)
    expected = sum(1 for s in segs if s["speaker"]["id"] == from_id)
    r = client.post(f"/api/meetings/{mid}/speakers/reassign", json={"from_person_id": from_id, "to_person_id": to_id})
    assert r.status_code == 200 and r.json() == {"reassigned": expected}
    assert all(s["speaker"]["id"] != from_id for s in _segments(client, mid))
    speakers = [s["person"]["id"] for s in client.get(f"/api/meetings/{mid}/insights").json()["speakers"]]
    assert from_id not in speakers
    again = client.post(f"/api/meetings/{mid}/speakers/reassign", json={"from_person_id": from_id, "to_person_id": to_id})
    assert again.json() == {"reassigned": 0}


def test_reassign_requires_participants(client):
    meeting = _meeting(client)
    outsider = client.post("/api/people", json={"name": "Outsider"}).json()["id"]
    pid = meeting["participants"][0]["id"]
    url = f"/api/meetings/{meeting['id']}/speakers/reassign"
    assert client.post(url, json={"from_person_id": pid, "to_person_id": outsider}).status_code == 422
    assert client.post(url, json={"from_person_id": outsider, "to_person_id": pid}).status_code == 422
    assert client.post("/api/meetings/999999/speakers/reassign", json={"from_person_id": pid, "to_person_id": pid}).status_code == 404


# --- privacy and shares -------------------------------------------------------------------------


def test_privacy_defaults_to_link_and_persists(client):
    meeting = _meeting(client)
    assert meeting["privacy"] == "link"
    r = client.patch(f"/api/meetings/{meeting['id']}", json={"privacy": "owner"})
    assert r.status_code == 200 and r.json()["privacy"] == "owner"
    assert client.get(f"/api/meetings/{meeting['id']}").json()["privacy"] == "owner"
    for value in ("teammates_participants", "teammates", "participants", "participants_team", "link"):
        assert client.patch(f"/api/meetings/{meeting['id']}", json={"privacy": value}).json()["privacy"] == value
    assert client.patch(f"/api/meetings/{meeting['id']}", json={"privacy": "public"}).status_code == 422


def test_shares_crud(client):
    mid = _meeting(client)["id"]
    url = f"/api/meetings/{mid}/shares"
    assert client.get(url).json() == []
    created = client.post(url, json={"email": "  Ada@Example.COM "})
    assert created.status_code == 201 and created.json()["email"] == "ada@example.com"
    assert client.post(url, json={"email": "ada@example.com"}).status_code == 409  # unique per meeting
    assert client.post(url, json={"email": "not-an-email"}).status_code == 422
    assert client.post("/api/meetings/999999/shares", json={"email": "a@b.co"}).status_code == 404
    other = _meeting(client, "q3 board")["id"]
    assert client.post(f"/api/meetings/{other}/shares", json={"email": "ada@example.com"}).status_code == 201  # other meeting ok
    assert [s["email"] for s in client.get(url).json()] == ["ada@example.com"]
    share_id = created.json()["id"]
    assert client.delete(f"/api/meetings/{other}/shares/{share_id}").status_code == 404  # wrong meeting
    assert client.delete(f"{url}/{share_id}").status_code == 204
    assert client.delete(f"{url}/{share_id}").status_code == 404
    assert client.get(url).json() == []

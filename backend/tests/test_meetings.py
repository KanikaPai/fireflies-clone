from sqlalchemy import text

from app.db import SessionLocal

PASTED = """[00:00] Ana Lopez: Welcome everyone, today we plan the launch.
[00:15] Ben Carter: I'll send the launch checklist by Friday.
[00:40] Ana Lopez: We need to confirm the pricing page copy with design."""


def _create(client, **overrides):
    body = {
        "title": "Launch planning",
        "meeting_date": "2026-10-01T15:00:00Z",
        "participants": ["Ana Lopez", "Ben Carter"],
        "platform": "zoom",
        "transcript_text": PASTED,
        **overrides,
    }
    return client.post("/api/meetings", json=body)


def test_health_and_me(client):
    assert client.get("/api/health").json() == {"status": "ok"}
    me = client.get("/api/me").json()
    assert me["email"] == "jordan.lee@acme.io"


def test_list_defaults_to_recent_first_with_pagination_shape(client):
    data = client.get("/api/meetings").json()
    assert set(data) == {"items", "total", "page", "page_size"}
    assert data["total"] == 8 and data["page"] == 1 and data["page_size"] == 20
    dates = [m["meeting_date"] for m in data["items"]]
    assert dates == sorted(dates, reverse=True)
    item = data["items"][0]
    assert {"participants", "tags", "action_item_count", "open_action_item_count", "platform", "status"} <= set(item)
    assert item["open_action_item_count"] <= item["action_item_count"]
    assert set(item["participants"][0]) == {"id", "name", "avatar_color"}


def test_list_sort_oldest_and_pagination(client):
    oldest = client.get("/api/meetings", params={"sort": "oldest"}).json()["items"]
    recent = client.get("/api/meetings").json()["items"]
    assert [m["id"] for m in oldest] == [m["id"] for m in reversed(recent)]
    page2 = client.get("/api/meetings", params={"page": 2, "page_size": 3}).json()
    assert page2["total"] == 8 and len(page2["items"]) == 3
    assert [m["id"] for m in page2["items"]] == [m["id"] for m in recent[3:6]]


def test_list_filters(client):
    by_title = client.get("/api/meetings", params={"q": "sprint"}).json()
    assert by_title["total"] == 1 and "Sprint" in by_title["items"][0]["title"]
    assert client.get("/api/meetings", params={"q": "%"}).json()["total"] == 0  # LIKE wildcards are escaped

    tags = {t["name"]: t["id"] for t in client.get("/api/tags").json()}
    by_tag = client.get("/api/meetings", params={"tag_id": tags["Customer"]}).json()
    assert by_tag["total"] == 2

    people = {p["name"]: p["id"] for p in client.get("/api/people").json()}
    by_person = client.get("/api/meetings", params={"participant_id": people["Carla Mendes"]}).json()
    assert by_person["total"] == 1 and by_person["items"][0]["title"].startswith("Discovery Call")

    target = client.get("/api/meetings", params={"q": "q3 board"}).json()["items"][0]
    day = target["meeting_date"][:10]
    on_day = client.get("/api/meetings", params={"date_from": day, "date_to": day}).json()
    assert [m["id"] for m in on_day["items"]] == [target["id"]]
    assert client.get("/api/meetings", params={"date_from": "2999-01-01"}).json()["total"] == 0


def test_list_rejects_bad_params(client):
    assert client.get("/api/meetings", params={"page": 0}).status_code == 422
    assert client.get("/api/meetings", params={"page_size": 101}).status_code == 422
    assert client.get("/api/meetings", params={"sort": "sideways"}).status_code == 422


def test_get_detail(client):
    mid = client.get("/api/meetings", params={"q": "sprint"}).json()["items"][0]["id"]
    d = client.get(f"/api/meetings/{mid}").json()
    assert d["summary"]["overview"] and 5 <= len(d["summary"]["keywords"]) <= 8
    assert d["summary"]["generated_by"] == "seed"
    orders = [c["order_index"] for c in d["chapters"]]
    assert orders == sorted(orders) and len(orders) >= 3
    assert d["action_items"] and any(a["assignee"] for a in d["action_items"])
    linked = [a for a in d["action_items"] if a["source_segment_id"]]
    assert linked and all(a["source_start_ms"] is not None for a in linked)
    assert d["participants"][0]["role"] == "host"


def test_missing_resources_return_404_with_detail(client):
    for url in ("/api/meetings/9999", "/api/meetings/9999/transcript"):
        r = client.get(url)
        assert r.status_code == 404 and "detail" in r.json()
    assert client.delete("/api/meetings/9999").status_code == 404
    assert client.patch("/api/meetings/9999", json={"title": "x"}).status_code == 404
    assert client.post("/api/meetings/9999/summary/regenerate").status_code == 404


def test_transcript_ordered_with_speakers_and_match_ids(client):
    mid = client.get("/api/meetings", params={"q": "q3 board"}).json()["items"][0]["id"]
    t = client.get(f"/api/meetings/{mid}/transcript").json()
    starts = [s["start_ms"] for s in t["segments"]]
    assert starts == sorted(starts) and t["matching_segment_ids"] is None
    assert {"id", "name", "avatar_color"} == set(t["segments"][0]["speaker"])

    hit = client.get(f"/api/meetings/{mid}/transcript", params={"q": "runway"}).json()
    ids = set(hit["matching_segment_ids"])
    assert ids and all("runway" in s["text"].lower() for s in hit["segments"] if s["id"] in ids)
    assert len(hit["segments"]) == len(t["segments"])  # q marks matches, it does not drop segments
    assert client.get(f"/api/meetings/{mid}/transcript", params={"q": '"*( )'}).json()["matching_segment_ids"] == []
    assert client.get(f"/api/meetings/{mid}/transcript", params={"q": '"*( OR'}).status_code == 200  # operators are literals


def test_create_via_paste(client):
    r = _create(client)
    assert r.status_code == 201
    d = r.json()
    assert d["status"] == "ready" and d["platform"] == "zoom"
    assert d["duration_seconds"] >= 40
    assert {p["name"] for p in d["participants"]} == {"Ana Lopez", "Ben Carter"}
    assert d["participants"][0]["name"] == "Ana Lopez" and d["participants"][0]["role"] == "host"
    assert d["summary"]["generated_by"] == "heuristic" and d["chapters"]
    assert any("checklist" in a["text"] for a in d["action_items"])
    transcript = client.get(f"/api/meetings/{d['id']}/transcript").json()
    assert len(transcript["segments"]) == 3


def test_create_reuses_existing_people_case_insensitively(client):
    before = len(client.get("/api/people").json())
    d = _create(client, participants=["priya nair"], transcript_text="PRIYA NAIR: Hello there team, let's begin.").json()
    assert len(client.get("/api/people").json()) == before
    assert d["participants"][0]["name"] == "Priya Nair"


def test_create_without_transcript_is_processing(client):
    d = _create(client, transcript_text=None).json()
    assert d["status"] == "processing" and d["summary"] is None and d["duration_seconds"] == 0
    assert client.post(f"/api/meetings/{d['id']}/summary/regenerate").status_code == 400


def test_create_validation(client):
    assert _create(client, title="").status_code == 422
    assert _create(client, transcript_text="just some text without speakers").status_code == 422
    assert client.post("/api/meetings", json={"title": "x"}).status_code == 422


def test_patch_meeting(client):
    d = _create(client).json()
    tag = client.post("/api/tags", json={"name": "Launch"}).json()
    people = {p["name"]: p["id"] for p in client.get("/api/people").json()}
    r = client.patch(
        f"/api/meetings/{d['id']}",
        json={"title": "Renamed", "meeting_date": "2026-10-02T09:30:00+02:00",
              "participant_ids": [people["Ana Lopez"], people["Jordan Lee"]], "tag_ids": [tag["id"]]},
    )
    assert r.status_code == 200
    u = r.json()
    assert u["title"] == "Renamed" and u["meeting_date"].startswith("2026-10-02T07:30")
    assert {p["name"] for p in u["participants"]} == {"Ana Lopez", "Jordan Lee"}
    assert next(p for p in u["participants"] if p["name"] == "Ana Lopez")["role"] == "host"  # role preserved
    assert [t["name"] for t in u["tags"]] == ["Launch"]

    partial = client.patch(f"/api/meetings/{d['id']}", json={"title": "Only title"}).json()
    assert partial["title"] == "Only title" and len(partial["participants"]) == 2 and partial["tags"]
    assert client.patch(f"/api/meetings/{d['id']}", json={"tag_ids": [99999]}).status_code == 400
    assert client.patch(f"/api/meetings/{d['id']}", json={"participant_ids": [99999]}).status_code == 400
    assert client.patch(f"/api/meetings/{d['id']}", json={"title": ""}).status_code == 422


def test_delete_cascades_to_all_children(client):
    mid = client.get("/api/meetings", params={"q": "sprint"}).json()["items"][0]["id"]
    with SessionLocal() as s:
        seg_ids = [r[0] for r in s.execute(text("SELECT id FROM transcript_segments WHERE meeting_id=:m"), {"m": mid})]
    assert seg_ids
    assert client.delete(f"/api/meetings/{mid}").status_code == 204
    assert client.get(f"/api/meetings/{mid}").status_code == 404
    with SessionLocal() as s:
        for table in ("transcript_segments", "chapters", "action_items", "summaries", "meeting_participants", "meeting_tags"):
            assert s.execute(text(f"SELECT COUNT(*) FROM {table} WHERE meeting_id=:m"), {"m": mid}).scalar() == 0, table
        assert s.execute(text("SELECT COUNT(*) FROM transcript_fts_docsize")).scalar() == s.execute(
            text("SELECT COUNT(*) FROM transcript_segments")
        ).scalar()
    assert client.get("/api/meetings").json()["total"] == 7
    assert client.get("/api/people").status_code == 200  # people are shared, not deleted


def test_regenerate_summary_keeps_existing_action_items(client):
    mid = client.get("/api/meetings", params={"q": "sprint"}).json()["items"][0]["id"]
    before = client.get(f"/api/meetings/{mid}").json()
    r = client.post(f"/api/meetings/{mid}/summary/regenerate")
    assert r.status_code == 200
    after = r.json()
    assert after["summary"]["generated_by"] == "heuristic" and after["summary"]["overview"] != before["summary"]["overview"]
    assert after["chapters"] and [a["id"] for a in after["action_items"]] == [a["id"] for a in before["action_items"]]

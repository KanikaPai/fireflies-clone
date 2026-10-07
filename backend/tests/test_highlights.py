import sqlite3
from pathlib import Path

import pytest
from sqlalchemy import create_engine

from app import db


def _segments(client, meeting_id: int = 1) -> list[dict]:
    return client.get(f"/api/meetings/{meeting_id}/transcript").json()["segments"]


def _add(client, segment, start=0, end=5, kind="highlight", note=None, meeting_id: int = 1):
    body = {"segment_id": segment["id"], "kind": kind, "start_char": start, "end_char": end}
    if note is not None:
        body["note"] = note
    return client.post(f"/api/meetings/{meeting_id}/highlights", json=body)


def test_seed_has_example_highlights_and_comments_in_two_meetings(client):
    first = client.get("/api/meetings/1/highlights").json()
    assert {h["kind"] for h in first} == {"highlight", "comment"}
    totals = {mid: len(client.get(f"/api/meetings/{mid}/highlights").json()) for mid in range(1, 9)}
    assert sum(totals.values()) == 4 and sum(1 for n in totals.values() if n) == 2
    comment = next(h for h in first if h["kind"] == "comment")
    seg = next(s for s in _segments(client) if s["id"] == comment["segment_id"])
    assert seg["text"][comment["start_char"] : comment["end_char"]] == comment["quote"]
    assert comment["author"]["name"] and comment["note"]
    assert [h["segment_start_ms"] for h in first] == sorted(h["segment_start_ms"] for h in first)  # timestamp order


def test_create_highlight_and_comment_then_list_and_filter(client):
    seg = _segments(client)[2]
    h = _add(client, seg, 4, 12)
    assert h.status_code == 201
    body = h.json()
    assert body["kind"] == "highlight" and body["quote"] == seg["text"][4:12] and body["note"] is None
    c = _add(client, seg, 0, 3, kind="comment", note="  Check this  ").json()
    assert c["note"] == "Check this" and c["quote"] == seg["text"][0:3]
    ids = {x["id"] for x in client.get("/api/meetings/1/highlights").json()}
    assert {body["id"], c["id"]} <= ids
    only = client.get("/api/meetings/1/highlights", params={"kind": "comment"}).json()
    assert only and all(x["kind"] == "comment" for x in only)


def test_whole_segment_comment_without_range(client):
    seg = _segments(client)[3]
    r = client.post("/api/meetings/1/highlights", json={"segment_id": seg["id"], "kind": "comment", "note": "Whole turn"})
    assert r.status_code == 201
    body = r.json()
    assert body["start_char"] is None and body["quote"] == seg["text"]


@pytest.mark.parametrize(
    "extra",
    [
        {"start_char": 5, "end_char": 5},  # empty range
        {"start_char": 9, "end_char": 3},  # reversed
        {"start_char": 2},  # half a range
        {"start_char": 0, "end_char": 100000},  # beyond the text
        {"start_char": -1, "end_char": 4},
    ],
)
def test_range_validation(client, extra):
    seg = _segments(client)[0]
    r = client.post("/api/meetings/1/highlights", json={"segment_id": seg["id"], "kind": "highlight", **extra})
    assert r.status_code == 422


def test_highlight_needs_range_and_comment_needs_note(client):
    seg = _segments(client)[0]
    assert client.post("/api/meetings/1/highlights", json={"segment_id": seg["id"], "kind": "highlight"}).status_code == 422
    assert _add(client, seg, 0, 4, kind="comment").status_code == 422
    assert _add(client, seg, 0, 4, kind="comment", note="   ").status_code == 422
    assert _add(client, seg, 0, 4, kind="comment", note="x" * 2001).status_code == 422


def test_segment_must_belong_to_the_meeting(client):
    other = _segments(client, 2)[0]
    assert _add(client, other, 0, 4, meeting_id=1).status_code == 422
    assert client.post("/api/meetings/1/highlights", json={"segment_id": 999999, "start_char": 0, "end_char": 3}).status_code == 422
    assert client.get("/api/meetings/999/highlights").status_code == 404
    assert _add(client, _segments(client)[0], meeting_id=999).status_code == 404


def test_whitespace_only_range_is_rejected(client):
    seg = next(s for s in _segments(client) if " " in s["text"])
    i = seg["text"].index(" ")
    assert _add(client, seg, i, i + 1).status_code == 422


def test_delete_highlight(client):
    h = _add(client, _segments(client)[1], 0, 4).json()
    assert client.delete(f"/api/highlights/{h['id']}").status_code == 204
    assert client.delete(f"/api/highlights/{h['id']}").status_code == 404
    assert h["id"] not in {x["id"] for x in client.get("/api/meetings/1/highlights").json()}


def test_highlights_are_removed_with_the_meeting_and_the_segment(client):
    before = len(client.get("/api/meetings/1/highlights").json())
    assert before > 0
    assert client.delete("/api/meetings/1").status_code == 204
    assert client.get("/api/meetings/1/highlights").status_code == 404
    assert len(client.get("/api/meetings/6/highlights").json()) == 2  # other meetings untouched


def test_editing_a_segment_drops_highlights_that_no_longer_fit(client):
    seg = _segments(client)[5]
    keep = _add(client, seg, 0, 4).json()
    drop = _add(client, seg, 6, 12).json()
    comment = _add(client, seg, 6, 12, kind="comment", note="keep my note").json()
    # Insert text at the front: the first 4 chars change, so every range now points at different text.
    client.patch(f"/api/segments/{seg['id']}", json={"text": "ZZ " + seg["text"]})
    after = {h["id"]: h for h in client.get("/api/meetings/1/highlights").json()}
    assert keep["id"] not in after and drop["id"] not in after  # highlights whose text moved are dropped
    assert after[comment["id"]]["start_char"] is None  # the comment survives as a whole-segment comment
    assert after[comment["id"]]["note"] == "keep my note" and after[comment["id"]]["quote"] == comment["quote"]


def test_editing_elsewhere_in_the_segment_keeps_highlights(client):
    seg = _segments(client)[6]
    h = _add(client, seg, 0, 4).json()
    client.patch(f"/api/segments/{seg['id']}", json={"text": seg["text"] + " And one more thing."})
    assert h["id"] in {x["id"] for x in client.get("/api/meetings/1/highlights").json()}


def test_find_and_replace_reconciles_highlights(client):
    seg = _segments(client)[7]
    word = seg["text"].split()[1]
    start = seg["text"].index(word)
    h = _add(client, seg, start, start + len(word)).json()
    client.post("/api/meetings/1/transcript/replace", json={"find": word, "replace": "RENAMED", "segment_ids": [seg["id"]]})
    assert h["id"] not in {x["id"] for x in client.get("/api/meetings/1/highlights").json()}


def test_stale_database_without_the_new_columns_is_recreated(tmp_path: Path, monkeypatch) -> None:
    """The Phase 8 startup check: an older segment_highlights table (no kind/range columns) triggers a rebuild."""
    path = tmp_path / "old.db"
    engine = create_engine(f"sqlite:///{path}")
    monkeypatch.setattr(db, "engine", engine)
    monkeypatch.setattr(db, "DATABASE_URL", f"sqlite:///{path}")
    db.init_db()
    engine.dispose()
    conn = sqlite3.connect(path)
    conn.execute("DROP TABLE segment_highlights")
    conn.execute("CREATE TABLE segment_highlights (id INTEGER PRIMARY KEY, segment_id INTEGER, user_id INTEGER, note TEXT, created_at DATETIME)")
    conn.commit()
    conn.close()
    engine = create_engine(f"sqlite:///{path}")
    monkeypatch.setattr(db, "engine", engine)
    db.init_db()
    cols = {c["name"] for c in db.inspect(engine).get_columns("segment_highlights")}
    assert {"kind", "start_char", "end_char", "quote"} <= cols
    engine.dispose()

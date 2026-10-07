"""Timestamped summary bullets, chapter points and the feed preview on the meeting list."""

import json

from sqlalchemy import event

from app.db import engine
from tests.conftest import final
from app.services.summarizer import ClaudeSummarizer


def _sprint(client):
    mid = client.get("/api/meetings", params={"q": "sprint"}).json()["items"][0]["id"]
    return client.get(f"/api/meetings/{mid}").json(), mid


def test_seeded_bullets_and_points_point_at_the_right_segments(client):
    detail, mid = _sprint(client)
    bullets = detail["summary"]["bullets"]
    assert 5 <= len(bullets) <= 7
    starts = [b["start_ms"] for b in bullets]
    assert starts == sorted(starts)
    segments = {s["start_ms"]: s for s in client.get(f"/api/meetings/{mid}/transcript").json()["segments"]}
    capacity = next(b for b in bullets if b["label"] == "Capacity")
    assert "buffer" in segments[capacity["start_ms"]]["text"]  # start_ms is the segment where it was said
    for chapter in detail["chapters"]:
        assert 2 <= len(chapter["points"]) <= 4
        for point in chapter["points"]:
            assert chapter["start_ms"] <= point["start_ms"] <= chapter["end_ms"]
            assert point["start_ms"] in segments


def test_list_includes_feed_preview_bullets(client):
    items = client.get("/api/meetings").json()["items"]
    assert all(1 <= len(m["summary_bullets"]) <= 5 for m in items)
    detail = client.get(f"/api/meetings/{items[0]['id']}").json()
    assert items[0]["summary_bullets"] == detail["summary"]["bullets"][:5]


def test_list_query_count_is_constant(client):
    """The list endpoint must not issue per-meeting queries (selectinload + one aggregate)."""
    counts: list[int] = []

    def measure(page_size: int) -> int:
        statements: list[str] = []
        listener = lambda *args: statements.append(args[2])  # noqa: E731
        event.listen(engine, "before_cursor_execute", listener)
        try:
            assert client.get("/api/meetings", params={"page_size": page_size}).status_code == 200
        finally:
            event.remove(engine, "before_cursor_execute", listener)
        return len(statements)

    counts = [measure(1), measure(3), measure(8)]
    assert len(set(counts)) == 1, counts


def test_heuristic_generates_bullets_and_points_from_chapters(client):
    created = final(client, client.post(
        "/api/meetings",
        json={
            "title": "Pricing sync",
            "meeting_date": "2026-10-01T10:00:00Z",
            "transcript_text": "\n".join(
                f"{'Ann' if i % 2 else 'Bob'}: [{i}] The pricing proposal needs a clearer enterprise tier and a simpler discount model."
                f" We should compare the billing plans before Friday and document the open questions for finance."
                for i in range(12)
            ),
        },
    ))
    summary, chapters = created["summary"], created["chapters"]
    assert summary["generated_by"] == "heuristic" and len(summary["bullets"]) == len(chapters)
    starts = {c["start_ms"] for c in chapters}
    for bullet, chapter in zip(summary["bullets"], chapters):
        assert bullet["label"] == chapter["title"] and bullet["text"]
        assert chapter["start_ms"] <= bullet["start_ms"] <= chapter["end_ms"]
    assert starts and all(c["points"] and all(p["start_ms"] >= c["start_ms"] for p in c["points"]) for c in chapters)


def test_llm_bullets_and_points_are_converted_to_timestamps(client, monkeypatch):
    payload = {
        "overview": "Mock.", "keywords": ["a"],
        "bullets": [{"label": "Greeting", "text": "They said hello.", "segment_index": 1}],
        "chapters": [{"title": "Intro", "summary": "s", "start_index": 0, "end_index": 1,
                      "points": [{"text": "Hello exchanged", "segment_index": 1}]}],
        "action_items": [],
    }
    monkeypatch.setattr(ClaudeSummarizer, "_complete", lambda self, t: json.dumps(payload))
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    d = final(client, client.post("/api/meetings", json={"title": "LLM", "meeting_date": "2026-10-01T10:00:00Z",
                                           "transcript_text": "Ann: Hello there everyone.\nBob: Hi Ann, good morning."}))
    transcript = client.get(f"/api/meetings/{d['id']}/transcript").json()["segments"]
    assert d["summary"]["bullets"] == [{"label": "Greeting", "text": "They said hello.", "start_ms": transcript[1]["start_ms"]}]
    assert d["chapters"][0]["points"] == [{"text": "Hello exchanged", "start_ms": transcript[1]["start_ms"]}]

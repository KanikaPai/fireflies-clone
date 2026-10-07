"""Create -> processing -> ready/failed, retry, startup recovery, attaching a transcript, default privacy."""

import pytest

from app.services import processing
from tests.conftest import final

PASTED = "[00:00] Ana Lopez: Welcome everyone, today we plan the launch.\n[00:15] Ben Carter: I'll send the launch checklist by Friday."
NEW = {"title": "Launch", "meeting_date": "2026-10-01T15:00:00Z"}


def _upload(client, name, content, **form):
    return client.post("/api/meetings/upload", data={**NEW, **form}, files={"file": (name, content, "text/plain")})


@pytest.fixture()
def hold(monkeypatch):
    """Leave new meetings in `processing` so tests can look at (and drive) that state."""
    queued: list[int] = []
    monkeypatch.setattr(processing, "process_meeting", queued.append)
    return queued


# --- the happy paths -----------------------------------------------------------------------------


@pytest.mark.parametrize("name", ["product_kickoff.txt", "weekly_standup.vtt", "support_call.json"])
def test_upload_is_saved_as_processing_and_queues_one_job(client, sample, hold, name):
    created = _upload(client, name, sample(name)).json()
    assert created["status"] == "processing" and created["summary"] is None and created["error_message"] is None
    assert hold == [created["id"]]  # exactly one background job was queued
    assert client.get(f"/api/meetings/{created['id']}/transcript").json()["segments"]  # transcript is saved immediately



def test_processing_runs_in_the_background_after_the_response(client, sample):
    r = _upload(client, "product_kickoff.txt", sample("product_kickoff.txt"))
    assert r.json()["status"] == "processing"  # what the client sees immediately
    d = final(client, r)  # TestClient has already run the background task
    assert d["status"] == "ready" and d["summary"] and d["chapters"] and d["action_items"]


@pytest.mark.parametrize("name", ["product_kickoff.txt", "weekly_standup.vtt", "support_call.json"])
def test_each_sample_format_ends_ready_with_notes(client, sample, name):
    d = final(client, _upload(client, name, sample(name)))
    assert d["status"] == "ready" and d["summary"]["overview"] and d["chapters"] and d["action_items"]
    assert d["duration_seconds"] > 60 and d["error_message"] is None


def test_paste_goes_processing_then_ready(client, hold):
    created = client.post("/api/meetings", json={**NEW, "transcript_text": PASTED}).json()
    assert created["status"] == "processing" and hold == [created["id"]]


def test_manual_meeting_is_ready_immediately_without_summary(client, hold):
    people = client.get("/api/people").json()
    tag = client.get("/api/tags").json()[0]
    r = client.post(
        "/api/meetings",
        json={**NEW, "participant_ids": [people[0]["id"], people[1]["id"]], "tag_ids": [tag["id"]], "duration_seconds": 1800},
    )
    d = r.json()
    assert r.status_code == 201 and d["status"] == "ready" and d["summary"] is None and hold == []
    assert d["duration_seconds"] == 1800 and [t["id"] for t in d["tags"]] == [tag["id"]]
    assert {p["id"] for p in d["participants"]} == {people[0]["id"], people[1]["id"]}
    assert sum(p["role"] == "host" for p in d["participants"]) == 1
    assert client.post("/api/meetings", json={**NEW, "participant_ids": [999999]}).status_code == 422
    assert client.post("/api/meetings", json={**NEW, "duration_seconds": -5}).status_code == 422


def test_delay_is_configurable_and_applied(monkeypatch, client):
    slept: list[float] = []
    monkeypatch.setattr(processing.time, "sleep", slept.append)
    monkeypatch.setenv("PROCESSING_DELAY_SECONDS", "2.5")
    final(client, client.post("/api/meetings", json={**NEW, "transcript_text": PASTED}))
    assert slept == [2.5]
    monkeypatch.setenv("PROCESSING_DELAY_SECONDS", "garbage")
    assert processing.processing_delay() == processing.DEFAULT_DELAY_SECONDS
    monkeypatch.setenv("PROCESSING_DELAY_SECONDS", "0")
    assert processing.processing_delay() == 0


def test_process_meeting_only_acts_on_processing_meetings(client):
    d = final(client, client.post("/api/meetings", json={**NEW, "transcript_text": PASTED}))
    updated = d["updated_at"]
    processing.process_meeting(d["id"])  # already ready: no-op
    processing.process_meeting(424242)  # unknown id: no-op
    assert client.get(f"/api/meetings/{d['id']}").json()["updated_at"] == updated


# --- failure and retry ---------------------------------------------------------------------------


def test_failure_marks_failed_with_message_and_retry_recovers(client, monkeypatch):
    monkeypatch.setenv("PROCESSING_FAIL_PATTERN", "boom")
    r = client.post("/api/meetings", json={**NEW, "title": "Boom review", "transcript_text": PASTED})
    d = final(client, r)
    assert d["status"] == "failed" and "Simulated processing failure" in d["error_message"] and d["summary"] is None
    listed = next(m for m in client.get("/api/meetings", params={"status": "failed"}).json()["items"] if m["id"] == d["id"])
    assert listed["error_message"] == d["error_message"]
    assert client.get("/api/meetings", params={"status": "processing"}).json()["total"] == 0

    again = client.post(f"/api/meetings/{d['id']}/retry")  # still fails: the title still matches
    assert again.status_code == 200 and again.json()["status"] == "processing" and again.json()["error_message"] is None
    assert client.get(f"/api/meetings/{d['id']}").json()["status"] == "failed"

    client.patch(f"/api/meetings/{d['id']}", json={"title": "Launch review"})
    client.post(f"/api/meetings/{d['id']}/retry")
    ok = client.get(f"/api/meetings/{d['id']}").json()
    assert ok["status"] == "ready" and ok["error_message"] is None and ok["summary"] and ok["chapters"]


def test_unexpected_errors_also_end_failed_not_stuck(client, monkeypatch):
    def explode(db, meeting):
        raise ValueError("model exploded")

    monkeypatch.setattr(processing.meeting_analysis, "generate_and_store", explode)
    d = final(client, client.post("/api/meetings", json={**NEW, "transcript_text": PASTED}))
    assert d["status"] == "failed" and d["error_message"] == "model exploded"
    assert d["summary"] is None and d["chapters"] == []  # nothing half-written


def test_retry_is_409_unless_failed(client, hold):
    ready = client.get("/api/meetings").json()["items"][0]["id"]
    assert client.post(f"/api/meetings/{ready}/retry").status_code == 409
    pending = client.post("/api/meetings", json={**NEW, "transcript_text": PASTED}).json()
    assert pending["status"] == "processing"
    assert client.post(f"/api/meetings/{pending['id']}/retry").status_code == 409
    assert client.post("/api/meetings/999999/retry").status_code == 404


# --- startup recovery ----------------------------------------------------------------------------


def test_recover_stuck_requeues_processing_meetings(client, hold):
    stuck = client.post("/api/meetings", json={**NEW, "transcript_text": PASTED}).json()
    scheduled: list[int] = []
    assert processing.recover_stuck(scheduled.append) == [stuck["id"]] == scheduled
    assert client.get(f"/api/meetings/{stuck['id']}").json()["status"] == "processing"  # not changed until it runs


def test_recovery_finishes_the_work(client, monkeypatch):
    queued: list[int] = []
    monkeypatch.setattr(processing, "process_meeting", queued.append)
    stuck = client.post("/api/meetings", json={**NEW, "transcript_text": PASTED}).json()
    monkeypatch.undo()  # the "restarted" server has the real processor again
    monkeypatch.setenv("PROCESSING_DELAY_SECONDS", "0")
    done: list[int] = []
    processing.recover_stuck(lambda mid: (processing.process_meeting(mid), done.append(mid)))
    assert done == [stuck["id"]]
    d = client.get(f"/api/meetings/{stuck['id']}").json()
    assert d["status"] == "ready" and d["summary"]


def test_recovery_marks_transcript_less_processing_meetings_ready(client, hold):
    from app.db import SessionLocal
    from app.models import Meeting, MeetingStatus

    manual = client.post("/api/meetings", json=NEW).json()
    with SessionLocal() as db:
        db.get(Meeting, manual["id"]).status = MeetingStatus.PROCESSING  # legacy rows from before Phase 6
        db.commit()
    assert processing.recover_stuck(lambda _id: None) == []
    assert client.get(f"/api/meetings/{manual['id']}").json()["status"] == "ready"


def test_recovery_ignores_ready_and_failed_meetings(client, hold):
    assert processing.recover_stuck(lambda _id: None) == []


def test_app_startup_runs_recovery(monkeypatch, client):
    from fastapi.testclient import TestClient

    from app.main import app

    calls: list[object] = []
    monkeypatch.setattr(processing, "recover_stuck", lambda schedule: calls.append(schedule) or [])
    with TestClient(app):  # entering the context runs the lifespan
        pass
    assert calls == [processing.run_in_thread]


# --- attaching a transcript later ---------------------------------------------------------------


def test_attach_text_to_a_manual_meeting(client, hold):
    manual = client.post("/api/meetings", json={**NEW, "participants": ["Ana Lopez"]}).json()
    assert manual["status"] == "ready"
    r = client.post(f"/api/meetings/{manual['id']}/transcript", json={"text": PASTED})
    d = r.json()
    assert r.status_code == 200 and d["status"] == "processing" and hold == [manual["id"]]
    assert {p["name"] for p in d["participants"]} == {"Ana Lopez", "Ben Carter"}
    assert sum(p["role"] == "host" for p in d["participants"]) == 1 and d["duration_seconds"] >= 15
    assert len(client.get(f"/api/meetings/{manual['id']}/transcript").json()["segments"]) == 2
    assert client.post(f"/api/meetings/{manual['id']}/transcript", json={"text": PASTED}).status_code == 409


@pytest.mark.parametrize("name", ["product_kickoff.txt", "weekly_standup.vtt", "support_call.json"])
def test_attach_file_then_ready(client, sample, name):
    manual = client.post("/api/meetings", json=NEW).json()
    r = client.post(f"/api/meetings/{manual['id']}/transcript", files={"file": (name, sample(name), "text/plain")})
    assert r.status_code == 200 and r.json()["status"] == "processing"
    d = client.get(f"/api/meetings/{manual['id']}").json()
    assert d["status"] == "ready" and d["summary"] and d["action_items"]
    assert client.get(f"/api/meetings/{manual['id']}/transcript").json()["segments"]


def test_attach_errors(client, sample):
    manual = client.post("/api/meetings", json=NEW).json()
    url = f"/api/meetings/{manual['id']}/transcript"
    assert client.post("/api/meetings/999999/transcript", json={"text": PASTED}).status_code == 404
    assert client.post(url, files={"file": ("x.pdf", b"x", "text/plain")}).status_code == 415
    assert client.post(url, files={"file": ("big.txt", b"A: " + b"x" * (5 * 1024 * 1024), "text/plain")}).status_code == 413
    assert client.post(url, json={"text": "  "}).status_code == 422
    assert client.post(url, json={"text": "no speakers here at all"}).status_code == 422
    assert client.get(f"/api/meetings/{manual['id']}").json()["status"] == "ready"  # failed attempts changed nothing
    existing = client.get("/api/meetings").json()["items"][0]["id"]
    assert client.post(f"/api/meetings/{existing}/transcript", json={"text": PASTED}).status_code == 409


def test_get_transcript_route_still_works_next_to_post(client):
    mid = client.get("/api/meetings").json()["items"][0]["id"]
    assert client.get(f"/api/meetings/{mid}/transcript").status_code == 200


# --- default privacy ----------------------------------------------------------------------------


def test_new_meetings_get_the_users_default_privacy(client, sample, hold):
    assert client.post("/api/meetings", json=NEW).json()["privacy"] == "link"
    client.patch("/api/me/settings", json={"default_privacy": "participants_team"})
    assert client.post("/api/meetings", json=NEW).json()["privacy"] == "participants_team"
    assert client.post("/api/meetings", json={**NEW, "transcript_text": PASTED}).json()["privacy"] == "participants_team"
    assert _upload(client, "product_kickoff.txt", sample("product_kickoff.txt")).json()["privacy"] == "participants_team"
    client.patch("/api/me/settings", json={"default_privacy": "owner"})
    assert client.post("/api/meetings", json=NEW).json()["privacy"] == "owner"
    seeded = next(m for m in client.get("/api/meetings").json()["items"] if m["title"] == "Sprint 24 Planning")
    assert client.get(f"/api/meetings/{seeded['id']}").json()["privacy"] == "link"  # existing meetings are untouched

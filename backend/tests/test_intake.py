"""POST /api/transcripts/parse: dry-run preview and input limits."""

import pytest

from app.db import SessionLocal
from app.models import Meeting, TranscriptSegment
from sqlalchemy import func, select

MB = 1024 * 1024


def _parse_file(client, name, content):
    return client.post("/api/transcripts/parse", files={"file": (name, content, "text/plain")})


@pytest.mark.parametrize(
    ("name", "fmt", "speakers", "min_segments"),
    [
        ("product_kickoff.txt", "txt", {"Nadia Rahman", "Owen Takahashi", "Priscilla Ortiz"}, 14),
        ("weekly_standup.vtt", "vtt", {"Isabel Moreau", "Kwame Mensah", "Lena Fischer"}, 9),
        ("support_call.json", "json", {"Dana Whitfield", "Marcus Oyelaran"}, 9),
    ],
)
def test_parse_each_sample_format(client, sample, name, fmt, speakers, min_segments):
    r = _parse_file(client, name, sample(name))
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["format_detected"] == fmt and d["segment_count"] >= min_segments and d["duration_seconds"] > 60
    assert {s["name"] for s in d["speakers"]} == speakers
    assert len(d["preview"]) == 5 and set(d["preview"][0]) == {"speaker", "start_ms", "end_ms", "text"}
    assert isinstance(d["warnings"], list)


def test_parse_writes_nothing(client, sample):
    with SessionLocal() as db:
        before = (db.scalar(select(func.count()).select_from(Meeting)), db.scalar(select(func.count()).select_from(TranscriptSegment)))
    _parse_file(client, "product_kickoff.txt", sample("product_kickoff.txt"))
    client.post("/api/transcripts/parse", json={"text": "Ann Lee: Hello there everyone.\nBob Ray: Hi Ann, thanks for joining."})
    with SessionLocal() as db:
        after = (db.scalar(select(func.count()).select_from(Meeting)), db.scalar(select(func.count()).select_from(TranscriptSegment)))
    assert before == after
    assert client.get("/api/people", params={"q": "Ann Lee"}).json() == []  # no people were created either


def test_parse_matches_existing_people_case_insensitively(client):
    text = "jordan lee: Welcome to the sync.\nBrand New Person: Thanks for having me today."
    d = client.post("/api/transcripts/parse", json={"text": text}).json()
    by_name = {s["name"]: s["matched_person_id"] for s in d["speakers"]}
    jordan = next(p["id"] for p in client.get("/api/people").json() if p["name"] == "Jordan Lee")
    assert by_name["jordan lee"] == jordan and by_name["Brand New Person"] is None


def test_parse_json_body_sniffs_format(client):
    vtt = "WEBVTT\n\n00:00:01.000 --> 00:00:04.000\n<v Ann Lee>Hello team, welcome.\n\n00:00:05.000 --> 00:00:09.000\n<v Bob Ray>Thanks for joining.\n"
    assert client.post("/api/transcripts/parse", json={"text": vtt}).json()["format_detected"] == "vtt"
    js = '[{"speaker": "Ann Lee", "start": 0, "end": 4, "text": "Hi there"}, {"speaker": "Bob", "start": 5, "end": 9, "text": "Hello"}]'
    assert client.post("/api/transcripts/parse", json={"text": js}).json()["format_detected"] == "json"
    assert client.post("/api/transcripts/parse", json={"text": "Ann Lee: Hi there friends.\nBob: Hello."}).json()["format_detected"] == "txt"


def test_parse_warnings(client):
    d = client.post("/api/transcripts/parse", json={"text": "Ann Lee: Hi there friends.\nBob Ray: Hello to you."}).json()
    joined = " ".join(d["warnings"])
    assert "No timestamps" in joined and "very short" in joined
    stamped = client.post("/api/transcripts/parse", json={"text": "[00:01] Ann Lee: Hi.\n[00:05] Bob Ray: Yo.\n[00:09] Ann Lee: Ok."}).json()
    assert not any("No timestamps" in w for w in stamped["warnings"])
    unknown = client.post("/api/transcripts/parse", json={"text": "[00:01] Ann Lee: Hi.\n[00:05] just words without a speaker\n[00:09] Ann Lee: Ok."}).json()
    assert any("no speaker" in w for w in unknown["warnings"])


def test_parse_limits_and_errors(client):
    assert _parse_file(client, "huge.txt", b"Ann Lee: " + b"x" * (5 * MB)).status_code == 413
    assert _parse_file(client, "exact.txt", b"Ann Lee: hi\nBob: yo\n" + b" " * (5 * MB - 20)).status_code == 200  # exactly 5 MB is allowed
    for name in ("notes.pdf", "audio.mp3", "noext"):
        r = _parse_file(client, name, b"hello")
        assert r.status_code == 415 and "Unsupported file type" in r.json()["detail"]
    assert _parse_file(client, "empty.txt", b"").status_code == 422
    assert _parse_file(client, "blank.txt", b"  \n \n").status_code == 422
    assert _parse_file(client, "bad.json", b"{not json").status_code == 422
    assert _parse_file(client, "nothing.txt", b"just a paragraph without any speaker labels at all").status_code == 422
    assert _parse_file(client, "latin.txt", "Ann: caf\xe9".encode("latin-1")).status_code == 422
    assert client.post("/api/transcripts/parse", json={"text": "   "}).status_code == 422
    assert client.post("/api/transcripts/parse", json={"nope": 1}).status_code == 422
    assert client.post("/api/transcripts/parse", content=b"x", headers={"content-type": "text/plain"}).status_code == 422
    assert client.post("/api/transcripts/parse", json={"text": "A: " + "x" * (5 * MB + 10)}).status_code == 413


def test_upload_endpoint_uses_the_same_limits(client):
    data = {"title": "T", "meeting_date": "2026-10-03T10:00:00Z"}
    big = client.post("/api/meetings/upload", data=data, files={"file": ("big.txt", b"A: " + b"x" * (5 * MB), "text/plain")})
    assert big.status_code == 413 and "too large" in big.json()["detail"]
    wrong = client.post("/api/meetings/upload", data=data, files={"file": ("x.docx", b"x", "text/plain")})
    assert wrong.status_code == 415

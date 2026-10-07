import json

import pytest

from app.services.transcript_parser import parse_transcript


def _export(client, meeting_id: int, fmt: str):
    return client.get(f"/api/meetings/{meeting_id}/export", params={"format": fmt})


def _transcript(client, meeting_id: int):
    return client.get(f"/api/meetings/{meeting_id}/transcript").json()["segments"]


def test_txt_export_has_speaker_timestamp_text_and_filename(client):
    r = _export(client, 1, "txt")
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/plain")
    assert r.headers["content-disposition"] == 'attachment; filename="sprint-24-planning-2026-10-06.txt"'
    first = _transcript(client, 1)[0]
    assert r.text.splitlines()[0].startswith("[00:03] ") and f"{first['speaker']['name']}: " in r.text.splitlines()[0]
    assert len(r.text.strip().splitlines()) == len(_transcript(client, 1))


@pytest.mark.parametrize("fmt", ["txt", "vtt"])
def test_txt_and_vtt_round_trip_through_the_upload_parser(client, fmt):
    segments = _transcript(client, 1)
    parsed = parse_transcript(_export(client, 1, fmt).text, fmt)
    assert len(parsed) == len(segments)
    assert [p.speaker for p in parsed] == [s["speaker"]["name"] for s in segments]
    assert [p.text for p in parsed] == [" ".join(s["text"].split()) for s in segments]
    if fmt == "vtt":  # exact millisecond timings survive in WebVTT
        assert [(p.start_ms, p.end_ms) for p in parsed] == [(s["start_ms"], s["end_ms"]) for s in segments]


def test_vtt_is_valid_webvtt_with_voice_tags(client):
    r = _export(client, 1, "vtt")
    assert r.headers["content-type"].startswith("text/vtt")
    assert r.text.startswith("WEBVTT\n\n")
    assert "00:00:03.000 --> " in r.text and "<v Jordan Lee>" in r.text


def test_vtt_escapes_markup_and_round_trips(client):
    seg = _transcript(client, 1)[0]
    client.patch(f"/api/segments/{seg['id']}", json={"text": "Use <b> & tags > plain"})
    vtt = _export(client, 1, "vtt").text
    assert "Use &lt;b&gt; &amp; tags &gt; plain" in vtt
    assert parse_transcript(vtt, "vtt")[0].text == "Use <b> & tags > plain"


def test_markdown_export_sections(client):
    md = _export(client, 1, "md").text
    assert md.startswith("# Sprint 24 Planning\n")
    for heading in ("## Summary", "## Notes", "## Action items", "## Transcript"):
        assert heading in md
    detail = client.get("/api/meetings/1").json()
    assert sum(1 for line in md.splitlines() if line.startswith("- [x] ") or line.startswith("- [ ] ")) == len(detail["action_items"])
    assert "- [x] " in md and "- [ ] " in md
    assert "**Jordan Lee** [00:03]:" in md


def test_json_export_is_the_full_meeting_detail_plus_transcript(client):
    r = _export(client, 1, "json")
    assert r.headers["content-type"].startswith("application/json")
    assert r.headers["content-disposition"].endswith('.json"')
    data = json.loads(r.text)
    detail = client.get("/api/meetings/1").json()
    assert {k: data[k] for k in detail} == detail
    assert len(data["transcript"]) == len(_transcript(client, 1))


def test_export_edge_cases(client):
    assert _export(client, 1, "pdf").status_code == 422
    assert _export(client, 999, "txt").status_code == 404
    assert client.get("/api/meetings/1/export").status_code == 200  # defaults to txt
    created = client.post("/api/meetings", json={"title": "Ünïcode / Plan?", "meeting_date": "2026-09-25T10:00:00Z"}).json()
    r = _export(client, created["id"], "md")  # a meeting without a transcript still exports
    assert 'filename="unicode-plan-2026-09-25.md"' in r.headers["content-disposition"] and "_No transcript._" in r.text

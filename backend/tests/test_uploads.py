import pytest

from tests.conftest import final


def _upload(client, filename, content, **form):
    data = {"title": "Uploaded call", "meeting_date": "2026-10-03T10:00:00Z", **form}
    return client.post("/api/meetings/upload", data=data, files={"file": (filename, content, "text/plain")})


@pytest.mark.parametrize(
    ("filename", "speakers", "min_segments"),
    [
        ("product_kickoff.txt", {"Nadia Rahman", "Owen Takahashi", "Priscilla Ortiz"}, 14),
        ("weekly_standup.vtt", {"Isabel Moreau", "Kwame Mensah", "Lena Fischer"}, 9),
        ("support_call.json", {"Dana Whitfield", "Marcus Oyelaran"}, 9),
    ],
)
def test_upload_each_format(client, sample, filename, speakers, min_segments):
    r = _upload(client, filename, sample(filename))
    assert r.status_code == 201, r.text
    d = final(client, r)
    assert d["status"] == "ready" and d["title"] == "Uploaded call"
    assert {p["name"] for p in d["participants"]} == speakers
    assert d["duration_seconds"] > 60
    assert d["summary"] and d["chapters"] and d["action_items"]
    assert all(a["assignee"] and a["source_segment_id"] for a in d["action_items"])
    t = client.get(f"/api/meetings/{d['id']}/transcript").json()["segments"]
    assert len(t) >= min_segments
    assert all(a["end_ms"] <= b["start_ms"] for a, b in zip(t, t[1:])), "segments must not overlap"
    last_end = t[-1]["end_ms"]
    assert d["duration_seconds"] == -(-last_end // 1000)


def test_upload_vtt_uses_cue_timestamps_exactly(client, sample):
    d = _upload(client, "weekly_standup.vtt", sample("weekly_standup.vtt")).json()
    first = client.get(f"/api/meetings/{d['id']}/transcript").json()["segments"][0]
    assert (first["start_ms"], first["end_ms"]) == (2000, 9500)


def test_upload_txt_without_timestamps_estimates_them(client):
    content = b"Ann Lee: Hello and welcome to the review.\nBob Ray: Thanks, let's start with the numbers please.\n"
    d = _upload(client, "plain.txt", content).json()
    t = client.get(f"/api/meetings/{d['id']}/transcript").json()["segments"]
    assert t[0]["start_ms"] > 0 and t[0]["end_ms"] > t[0]["start_ms"] and t[0]["end_ms"] <= t[1]["start_ms"]


def test_upload_errors(client):
    assert _upload(client, "notes.pdf", b"x").status_code == 415
    assert _upload(client, "empty.txt", b"").status_code == 422
    assert _upload(client, "blank.txt", b"   \n\n").status_code == 422
    assert _upload(client, "bad.json", b"{not json").status_code == 422
    assert _upload(client, "wrong.json", b'{"a": 1}').status_code == 422
    assert _upload(client, "nocues.vtt", b"WEBVTT\n\n").status_code == 422
    assert _upload(client, "nospeakers.txt", b"just a paragraph of text with no labels").status_code == 422
    assert _upload(client, "binary.txt", b"\xff\xfe\x00bad").status_code == 422
    r = _upload(client, "ok.txt", b"A B: hello there everyone")
    assert r.status_code == 201
    missing_title = client.post(
        "/api/meetings/upload", data={"meeting_date": "2026-10-03T10:00:00Z"}, files={"file": ("a.txt", b"A: x")}
    )
    assert missing_title.status_code == 422
    for r in (_upload(client, "x.pdf", b"x"), _upload(client, "e.txt", b"")):
        assert isinstance(r.json()["detail"], str)

import pytest


def test_search_groups_by_meeting_with_marked_snippets(client):
    r = client.get("/api/search", params={"q": "runway"})
    assert r.status_code == 200
    data = r.json()
    assert data["query"] == "runway" and data["total_meetings"] == len(data["results"]) >= 1
    result = data["results"][0]
    assert result["meeting"]["title"] == "Q3 Board Update" and result["title_match"] is False
    assert result["match_count"] >= len(result["matches"]) >= 1
    m = result["matches"][0]
    assert "<mark>runway</mark>" in m["snippet"].lower()
    assert {"segment_id", "start_ms", "speaker", "snippet"} == set(m)
    assert m["speaker"]["name"]
    seg = {s["id"]: s for s in client.get(f"/api/meetings/{result['meeting']['id']}/transcript").json()["segments"]}
    assert seg[m["segment_id"]]["start_ms"] == m["start_ms"]


def test_search_is_stemmed_prefix_and_multi_term(client):
    assert client.get("/api/search", params={"q": "retention"}).json()["total_meetings"] >= 1
    assert client.get("/api/search", params={"q": "retent"}).json()["total_meetings"] >= 1  # prefix on the last term
    both = client.get("/api/search", params={"q": "feature flag"}).json()
    assert both["total_meetings"] >= 1
    assert client.get("/api/search", params={"q": "zzzzqqqq"}).json()["results"] == []


def test_search_matches_titles(client):
    data = client.get("/api/search", params={"q": "brightwave"}).json()
    top = data["results"][0]
    assert top["meeting"]["title"].startswith("Discovery Call") and top["title_match"] is True
    assert client.get("/api/search", params={"q": "hiring debrief"}).json()["results"][0]["title_match"] is True


def test_search_limits(client):
    data = client.get("/api/search", params={"q": "the", "limit": 2, "matches_per_meeting": 1}).json()
    assert len(data["results"]) <= 2 and all(len(r["matches"]) <= 1 for r in data["results"])


@pytest.mark.parametrize(
    "q", ['"', '"unbalanced', "(", ")", "*", "run*", "a AND", "OR", "NOT", "NEAR(a b)", "col:val", "-x", "a OR (b", "'; DROP TABLE meetings;--", "\\", "😀", "<script>alert(1)</script>"],
)
def test_search_special_characters_never_error(client, q):
    r = client.get("/api/search", params={"q": q})
    assert r.status_code == 200, (q, r.text)
    assert "results" in r.json()


def test_search_snippets_are_html_safe(client):
    created = client.post(
        "/api/meetings",
        json={"title": "XSS check", "meeting_date": "2026-10-01T10:00:00Z",
              "transcript_text": "Eve: <img src=x onerror=alert(1)> payload & more text for the zebra search."},
    )
    assert created.status_code == 201
    snippet = client.get("/api/search", params={"q": "zebra"}).json()["results"][0]["matches"][0]["snippet"]
    assert "<img" not in snippet and "&lt;img" in snippet and "<mark>zebra</mark>" in snippet


def test_search_requires_query(client):
    assert client.get("/api/search").status_code == 422
    assert client.get("/api/search", params={"q": ""}).status_code == 422
    assert client.get("/api/search", params={"q": "   "}).json()["results"] == []


def test_search_reflects_new_and_deleted_meetings(client):
    d = client.post(
        "/api/meetings",
        json={"title": "Fresh", "meeting_date": "2026-10-01T10:00:00Z", "transcript_text": "Zed: quokka quokka quokka"},
    ).json()
    assert client.get("/api/search", params={"q": "quokka"}).json()["total_meetings"] == 1
    client.delete(f"/api/meetings/{d['id']}")
    assert client.get("/api/search", params={"q": "quokka"}).json()["total_meetings"] == 0

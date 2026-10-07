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


def test_search_also_returns_action_items_and_summary_bullets(client):
    data = client.get("/api/search", params={"q": "tickets"}).json()
    assert data["action_items_total"] >= 1 and data["action_items"]
    item = data["action_items"][0]
    assert "tickets" in item["text"].lower() and "<mark>" in item["snippet"].lower()
    assert {"id", "meeting", "is_completed", "assignee", "source_start_ms"} <= set(item)
    assert data["summary_bullets_total"] >= len(data["summary_bullets"])

    capacity = client.get("/api/search", params={"q": "capacity"}).json()
    bullet = capacity["summary_bullets"][0]
    assert bullet["start_ms"] >= 0 and "<mark>" in bullet["snippet"] and bullet["meeting"]["title"]


def test_search_categories_are_capped_but_totals_are_not(client):
    data = client.get("/api/search", params={"q": "the", "per_category": 1}).json()
    assert len(data["action_items"]) <= 1 and len(data["summary_bullets"]) <= 1
    assert data["action_items_total"] >= len(data["action_items"])
    assert data["summary_bullets_total"] >= len(data["summary_bullets"])


def test_category_snippets_are_html_escaped_and_survive_special_input(client):
    seg = client.get("/api/meetings/1").json()["action_items"][0]
    client.patch(f"/api/action-items/{seg['id']}", json={"text": "Fix <script>alert(1)</script> & ship amp"})
    data = client.get("/api/search", params={"q": "amp"}).json()
    snippets = [a["snippet"] for a in data["action_items"]]
    assert any("&lt;script&gt;" in s and "<mark>amp</mark>" in s for s in snippets)
    assert all("<script>" not in s for s in snippets)
    assert "&amp;" in next(s for s in snippets if "&lt;script&gt;" in s)  # the ampersand entity is intact, not marked
    for q in ['"', "%", "_", "a OR", "(", "\\"]:
        assert client.get("/api/search", params={"q": q}).status_code == 200


def test_category_search_is_scoped_by_all_terms(client):
    both = client.get("/api/search", params={"q": "tickets search"}).json()
    one = client.get("/api/search", params={"q": "tickets"}).json()
    assert both["action_items_total"] <= one["action_items_total"]
    assert client.get("/api/search", params={"q": "zzzqqq"}).json()["action_items_total"] == 0

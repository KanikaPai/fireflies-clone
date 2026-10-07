import re
from types import SimpleNamespace

import pytest

from app.services.askfred import llm as askfred


def _ask(client, question, meeting_id=1, history=None):
    return client.post(f"/api/meetings/{meeting_id}/ask", json={"question": question, "history": history or []})


def _segment_ids(client, meeting_id=1):
    return {s["id"] for s in client.get(f"/api/meetings/{meeting_id}/transcript").json()["segments"]}


def _assert_valid(client, body, meeting_id=1):
    assert body["source"] in ("llm", "heuristic")
    assert {c["segment_id"] for c in body["citations"]} <= _segment_ids(client, meeting_id)
    segs = {s["id"]: s for s in client.get(f"/api/meetings/{meeting_id}/transcript").json()["segments"]}
    for c in body["citations"]:
        assert c["start_ms"] == segs[c["segment_id"]]["start_ms"] and c["speaker"]["name"]


# --- validation -----------------------------------------------------------------------------------


def test_validation(client):
    assert _ask(client, "").status_code == 422
    assert _ask(client, "   ").status_code == 422
    assert _ask(client, "x" * 1001).status_code == 422
    assert client.post("/api/meetings/1/ask", json={}).status_code == 422
    assert client.post("/api/meetings/1/ask", json={"question": "hi", "history": [{"role": "bot", "content": "x"}]}).status_code == 422
    assert _ask(client, "summary", meeting_id=999).status_code == 404
    too_long = [{"role": "user", "content": "q"}] * 21
    assert client.post("/api/meetings/1/ask", json={"question": "hi", "history": too_long}).status_code == 422


# --- heuristic intents ----------------------------------------------------------------------------


@pytest.mark.parametrize("q", ["List action items", "what are the next steps?", "any tasks for us", "To do list please"])
def test_action_items_intent(client, q):
    body = _ask(client, q).json()
    assert body["source"] == "heuristic"
    items = client.get("/api/meetings/1").json()["action_items"]
    for item in items:
        assert item["text"] in body["answer_markdown"]
    assert "**Marcus Chen**" in body["answer_markdown"] and "due Oct" in body["answer_markdown"]
    assert "- [x] " in body["answer_markdown"] and "- [ ] " in body["answer_markdown"]
    assert body["citations"]
    _assert_valid(client, body)


@pytest.mark.parametrize("q", ["Summarize key decisions", "what were the takeaways", "give me the key points"])
def test_summary_intent_lists_bullets_with_timestamps(client, q):
    body = _ask(client, q).json()
    bullets = client.get("/api/meetings/1").json()["summary"]["bullets"]
    for b in bullets:
        assert b["text"] in body["answer_markdown"]
    assert re.search(r"\(\d\d:\d\d\)", body["answer_markdown"])
    assert len(body["citations"]) >= 1
    _assert_valid(client, body)


def test_follow_up_email_is_built_from_the_meeting(client):
    body = _ask(client, "Write a follow-up email").json()
    md = body["answer_markdown"]
    assert md.startswith("**Subject:** Follow-up: Sprint 24 Planning (Oct 6)")
    assert "Hi Liam, Marcus, Priya and Sofia," in md  # participants except the sender
    assert "**Key points**" in md and "**Action items**" in md and md.rstrip().endswith("Jordan Lee")
    assert "Create tickets for the search API" in md
    assert _ask(client, "draft a recap").json()["answer_markdown"].startswith("**Subject:**")


def test_speaker_intent_quotes_only_that_speakers_lines(client):
    body = _ask(client, "What did Liam say about the transcript page?").json()
    assert body["answer_markdown"].startswith("Here's what **Liam Foster** said")
    assert body["citations"] and all(c["speaker"]["name"] == "Liam Foster" for c in body["citations"])
    segs = {s["id"]: s["text"] for s in client.get("/api/meetings/1/transcript").json()["segments"]}
    quotes = re.findall(r'> "(.+?)"\n', body["answer_markdown"])
    assert quotes and all(any(q.rstrip("…") in segs[c["segment_id"]] for c in body["citations"]) for q in quotes)
    _assert_valid(client, body)
    assert _ask(client, "Priya's points").json()["citations"][0]["speaker"]["name"] == "Priya Nair"


def test_speaker_with_nothing_on_the_topic(client):
    body = _ask(client, "What did Liam say about unicorns?").json()
    assert "couldn't find" in body["answer_markdown"] and body["citations"] == []


def test_keyword_search_returns_top_matches_as_quotes(client):
    body = _ask(client, "how is the transcript scrolling performance?").json()
    assert body["answer_markdown"].startswith("Here's what was discussed about")
    assert 1 <= len(body["citations"]) <= 3
    assert "> \"" in body["answer_markdown"] and "sluggish" in body["answer_markdown"]
    _assert_valid(client, body)
    assert [c["start_ms"] for c in body["citations"]] == sorted(c["start_ms"] for c in body["citations"])


def test_synonyms_find_concerns(client):
    body = _ask(client, "What were the main concerns?").json()
    assert body["citations"] and "discussed about **concerns**" in body["answer_markdown"]
    _assert_valid(client, body)


def test_keyword_search_stays_inside_the_requested_meeting(client):
    body = _ask(client, "what about runway?", meeting_id=6).json()
    assert "runway" in body["answer_markdown"].lower()
    _assert_valid(client, body, 6)
    assert "couldn't find" in _ask(client, "what about runway?", meeting_id=1).json()["answer_markdown"]


@pytest.mark.parametrize("q", ["purple elephant dinosaur", "???", "what is the weather", "the and of"])
def test_no_match_never_invents_content(client, q):
    body = _ask(client, q).json()
    assert body["answer_markdown"] == "I couldn't find that in this meeting's transcript."
    assert body["citations"] == [] and body["source"] == "heuristic"


def test_meeting_without_transcript(client):
    created = client.post("/api/meetings", json={"title": "Empty", "meeting_date": "2026-09-25T10:00:00Z"}).json()
    body = _ask(client, "summarize", meeting_id=created["id"]).json()
    assert "no transcript yet" in body["answer_markdown"] and body["citations"] == []


def test_answers_are_deterministic(client):
    q = "what about the feature flag?"
    assert _ask(client, q).json() == _ask(client, q).json()


# --- LLM path -------------------------------------------------------------------------------------


@pytest.fixture()
def with_key(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")


def test_llm_answer_with_valid_and_invalid_citations(client, with_key, monkeypatch):
    ids = sorted(_segment_ids(client))
    calls = {}

    def fake(system, messages):
        calls["system"], calls["messages"] = system, messages
        return f"Search ships behind a flag [#{ids[3]}]. It was agreed [#{ids[5]}] [#{ids[3]}] and bogus [#999999]."

    monkeypatch.setattr(askfred, "_complete_llm", fake)
    body = _ask(client, "what was agreed?").json()
    assert body["source"] == "llm"
    assert body["answer_markdown"] == "Search ships behind a flag. It was agreed and bogus."  # markers removed
    assert [c["segment_id"] for c in body["citations"]] == [ids[3], ids[5]]  # invalid dropped, duplicates merged
    assert f"[#{ids[0]}]" in calls["system"] and "Sprint 24 Planning" in calls["system"]  # context is prefixed with ids
    assert "ONLY" in calls["system"] and calls["messages"] == [{"role": "user", "content": "what was agreed?"}]


def test_llm_receives_history_in_alternating_order(client, with_key, monkeypatch):
    seen = {}
    monkeypatch.setattr(askfred, "_complete_llm", lambda system, messages: seen.setdefault("m", messages) and "ok")
    history = [
        {"role": "assistant", "content": "stray assistant first"},
        {"role": "user", "content": "q1"},
        {"role": "assistant", "content": "a1"},
        {"role": "user", "content": "dangling"},
    ]
    assert _ask(client, "q2", history=history).json()["answer_markdown"] == "ok"
    assert [m["role"] for m in seen["m"]] == ["user", "assistant", "user"]
    assert seen["m"][-1]["content"] == "q2"


@pytest.mark.parametrize("failure", [TimeoutError("timed out"), RuntimeError("api down"), "   "])
def test_llm_failure_falls_back_to_the_heuristic_engine(client, with_key, monkeypatch, failure):
    def broken(system, messages):
        if isinstance(failure, Exception):
            raise failure
        return failure  # an empty answer

    monkeypatch.setattr(askfred, "_complete_llm", broken)
    body = _ask(client, "List action items")
    assert body.status_code == 200 and body.json()["source"] == "heuristic"
    assert "Create tickets" in body.json()["answer_markdown"]


def test_complete_llm_uses_a_timeout_and_the_configured_model(monkeypatch):
    captured = {}

    class FakeClient:
        def __init__(self, **kwargs):
            captured["client"] = kwargs
            self.messages = SimpleNamespace(create=self._create)

        def _create(self, **kwargs):
            captured["create"] = kwargs
            return SimpleNamespace(content=[SimpleNamespace(type="text", text="hello")])

    import anthropic

    monkeypatch.setattr(anthropic, "Anthropic", FakeClient)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "k")
    monkeypatch.setenv("ANTHROPIC_MODEL", "some-model")
    assert askfred._complete_llm("sys", [{"role": "user", "content": "q"}]) == "hello"
    assert captured["client"]["timeout"] == askfred.LLM_TIMEOUT_SECONDS
    assert captured["create"]["model"] == "some-model" and captured["create"]["system"] == "sys"

"""AskFred's built-in engine: tokenising, synonyms, BM25 retrieval, metadata questions and the overview fallback."""

import re

import pytest

from app.db import SessionLocal
from app.models import User
from app.services import meetings, transcript
from app.services.askfred import retrieval
from app.services.askfred.common import Meeting
from app.services.askfred.intents import Intent, detect_intent
from app.services.askfred.terms import content_words, stem, stems_of, surface_synonyms, synonyms_of


def _ask(client, question, meeting_id=1):
    return client.post(f"/api/meetings/{meeting_id}/ask", json={"question": question, "history": []})


def _body(client, question, meeting_id=1):
    body = _ask(client, question, meeting_id).json()
    assert body["source"] == "heuristic"
    segs = {s["id"]: s for s in client.get(f"/api/meetings/{meeting_id}/transcript").json()["segments"]}
    for c in body["citations"]:  # every citation points at a real segment of this meeting, with its real time
        assert c["start_ms"] == segs[c["segment_id"]]["start_ms"]
    return body


@pytest.fixture()
def context(client):
    """Build the engine's meeting context against the seeded database (sessions are closed afterwards)."""
    sessions = []

    def build(meeting_id=1) -> Meeting:
        db = SessionLocal()
        sessions.append(db)
        user = db.query(User).first()
        detail = meetings.get_meeting_detail(db, user, meeting_id)
        return Meeting(detail, transcript.get_transcript(db, user, meeting_id, None).segments, user.name, db)

    yield build
    for db in sessions:
        db.close()


# --- stemming and stopwords -----------------------------------------------------------------------


@pytest.mark.parametrize(
    "group",
    [
        ["launch", "launched", "launching", "launches"],
        ["concern", "concerns"],
        ["ship", "shipped", "shipping", "ships"],
        ["price", "prices", "pricing", "priced"],
        ["decide", "decided", "deciding"],
    ],
)
def test_stemming_groups_word_forms(group):
    assert len({stem(w) for w in group}) == 1


def test_stemming_keeps_different_words_apart():
    assert stem("process") == stem("processes") and stem("price") != stem("process")


def test_question_words_stopwords_and_punctuation_are_removed():
    assert content_words("What did the team think about the launch?!") == ["launch"]
    assert content_words("How did we discuss the pricing, again?") == ["pricing"]
    assert content_words("what's the Q3 budget...") == ["budget"]
    assert content_words("the and of") == [] and content_words("???") == []
    assert stems_of("Launching, launched!") == [stem("launch")] * 2


# --- synonyms -------------------------------------------------------------------------------------


def test_synonym_expansion():
    assert stem("release") in synonyms_of(stem("launch")) and stem("ship") in synonyms_of(stem("launch"))
    assert {"cost", "budget"} <= surface_synonyms("pricing")
    assert {"concern", "problem", "blocker"} <= surface_synonyms("risk")
    assert {"client", "user"} <= surface_synonyms("customer")
    assert {"candidate", "interview"} <= surface_synonyms("hire")
    assert surface_synonyms("zebra") == set()
    query = retrieval.build_query("any risks?")
    assert query.words == ["risks"] and stem("concern") in query.synonyms[stem("risks")]


# --- BM25 retrieval -------------------------------------------------------------------------------


def test_bm25_ranks_the_best_segment_first(context):
    ctx = context()
    hits = retrieval.search(ctx, retrieval.build_query("who needs the legacy queue migration plan?"))
    assert hits and "legacy queue" in hits[0].segment.text
    assert [h.score for h in hits] == sorted((h.score for h in hits), reverse=True)
    assert len(retrieval.search(ctx, retrieval.build_query("legacy queue"), limit=2)) <= 2


def test_phrase_match_beats_scattered_words(context):
    ctx = context()
    hits = retrieval.search(ctx, retrieval.build_query("feature flag"))
    assert "feature flag" in hits[0].segment.text.lower()


def test_synonyms_find_segments_without_the_typed_word(context):
    ctx = context()
    hits = retrieval.search(ctx, retrieval.build_query("launch"))
    assert hits and all(
        {stem("launch"), stem("release"), stem("ship"), stem("rollout"), stem("deploy"), stem("publish")} & set(stems_of(h.segment.text))
        for h in hits
    )


def test_search_stays_in_one_meeting_and_ignores_noise(context):
    assert retrieval.search(context(1), retrieval.build_query("runway")) == []
    assert retrieval.search(context(6), retrieval.build_query("runway"))
    assert retrieval.search(context(), retrieval.build_query("purple elephant")) == []
    assert retrieval.search(context(), retrieval.build_query("???")) == []


def test_fts_syntax_in_a_question_cannot_break_retrieval(client):
    for q in ['"unbalanced', "NEAR(a b) OR *", "legacy AND (queue", "queue:*^ -- ;"]:
        assert _ask(client, q).status_code == 200


# --- question types answered from metadata --------------------------------------------------------


@pytest.mark.parametrize(
    ("question", "intent"),
    [
        ("who attended?", Intent.PARTICIPANTS),
        ("Who was in this meeting?", Intent.PARTICIPANTS),
        ("who's on the call", Intent.PARTICIPANTS),
        ("list the participants", Intent.PARTICIPANTS),
        ("how long was it?", Intent.DURATION),
        ("How long was the meeting?", Intent.DURATION),
        ("what's the meeting duration", Intent.DURATION),
        ("when was this meeting?", Intent.WHEN),
        ("what date was the call", Intent.WHEN),
        ("What time did the meeting start", Intent.WHEN),
        ("who talked the most?", Intent.TALK_TIME),
        ("who spoke most", Intent.TALK_TIME),
        ("show talk time", Intent.TALK_TIME),
        ("what was decided about pricing?", Intent.STATUS),
        ("What's the status of the migration?", Intent.STATUS),
        ("any update on search", Intent.STATUS),
        ("what happens next?", Intent.ACTIONS),
        ("what are the next steps", Intent.ACTIONS),
        ("what did the team think about the launch?", Intent.KEYWORD),
        ("how long did the migration take", Intent.KEYWORD),  # a topic question, not the meeting length
        ("what day is the launch", Intent.KEYWORD),
        ("Summarize key decisions", Intent.SUMMARY),
        ("what was decided?", Intent.SUMMARY),  # no topic: the general summary
    ],
)
def test_question_types_are_recognised(context, question, intent):
    assert detect_intent(question, context())[0] is intent


def test_participants_answer(client):
    body = _body(client, "who was in this meeting?")
    for name in ("Jordan Lee", "Liam Foster", "Marcus Chen", "Priya Nair", "Sofia Alvarez"):
        assert f"**{name}**" in body["answer_markdown"]
    assert "5 participants" in body["answer_markdown"] and "(host)" in body["answer_markdown"]


def test_duration_answer(client):
    md = _body(client, "how long was it?")["answer_markdown"]
    seconds = client.get("/api/meetings/1").json()["duration_seconds"]
    assert f"{seconds // 60}:{seconds % 60:02d}" in md and "19 min" in md


def test_date_answer(client):
    md = _body(client, "what date was the meeting?")["answer_markdown"]
    assert "Tuesday, October 6, 2026" in md and "10:00 UTC" in md


def test_talk_time_answer_uses_insights(client):
    body = _body(client, "who talked the most?")
    insights = client.get("/api/meetings/1/insights").json()["speakers"]
    top = max(insights, key=lambda s: s["talk_time_ms"])
    assert body["answer_markdown"].startswith(f"**{top['person']['name']}** spoke the most")
    for s in insights:
        assert f"**{s['person']['name']}**: {s['talk_time_pct']}%" in body["answer_markdown"]
    assert body["citations"] and body["citations"][0]["speaker"]["name"] == top["person"]["name"]


def test_status_answer_leads_with_summary_bullets_then_quotes(client):
    body = _body(client, "what was decided about the feature flag?")
    md = body["answer_markdown"]
    bullet = next(b for b in client.get("/api/meetings/1").json()["summary"]["bullets"] if "feature flag" in b["text"])
    assert md.index(bullet["text"]) < md.index("Supporting lines from the transcript") < md.index("> \"")
    assert any(c["start_ms"] == bullet["start_ms"] or c["start_ms"] <= bullet["start_ms"] for c in body["citations"])


def test_next_steps_reuses_the_action_item_answer(client):
    md = _body(client, "what happens next?")["answer_markdown"]
    assert md.startswith("Here are the action items from **Sprint 24 Planning**")


def test_topic_answer_quotes_top_three_with_speaker_and_time(client):
    body = _body(client, "what did the team think about the launch?")
    quotes = re.findall(r'> "(.+?)"\n> — \*\*(.+?)\*\* \((\d\d:\d\d)\)', body["answer_markdown"])
    assert 1 <= len(quotes) <= 3 and all(speaker and clock for _, speaker, clock in quotes)
    assert body["citations"] and [c["start_ms"] for c in body["citations"]] == sorted(c["start_ms"] for c in body["citations"])


# --- never a dead end -----------------------------------------------------------------------------


def test_unrelated_question_gets_an_overview_not_a_dead_end(client):
    body = _body(client, "what is the weather like in Paris?")
    md = body["answer_markdown"]
    assert md.startswith("I couldn't find that exact topic in this meeting. Here's what was covered:")
    assert len(re.findall(r"^- \*\*.+:\*\* .+ \(\d\d:\d\d\)$", md, re.M)) == 3
    assert re.search(r"Try asking about: \*\*.+\*\*(, \*\*.+\*\*){2}$", md)
    assert len(body["citations"]) == 3  # one per bullet, each a real segment


def test_fallback_without_a_summary_uses_chapters_or_plain_message(client):
    created = client.post("/api/meetings", json={"title": "Bare", "meeting_date": "2026-09-25T10:00:00Z"}).json()
    # no transcript at all: the existing "no transcript yet" answer, never an invented overview
    assert "no transcript yet" in _body(client, "what about pricing?", created["id"])["answer_markdown"]

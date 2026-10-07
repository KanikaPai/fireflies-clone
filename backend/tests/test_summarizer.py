import json
from datetime import datetime, timezone

import pytest

from app.models import GeneratedBy
from app.services import summarizer
from tests.conftest import final
from app.services.summarizer import ClaudeSummarizer, HeuristicSummarizer, SegmentInput, generate_analysis

DATE = datetime(2026, 10, 7, 10, tzinfo=timezone.utc)  # a Wednesday


def _segments():
    lines = [
        ("Ann", "Welcome to the pricing review. Pricing changes affect every plan, so let's be careful."),
        ("Bob", "I'll send the revised pricing table by Friday. We need to check the enterprise plan too."),
        ("Ann", "Great. Is that realistic for the discount model?"),
        ("Cy", "Action item: update the billing documentation. Billing questions keep coming up in support."),
        ("Ann", "Okay, thanks everyone. Billing and pricing are the priorities."),
    ]
    return [SegmentInput(i, s, i * 60_000, i * 60_000 + 50_000, t) for i, (s, t) in enumerate(lines)]


def test_heuristic_keywords_chapters_and_actions():
    a = HeuristicSummarizer().generate(_segments(), DATE)
    assert a.generated_by == GeneratedBy.HEURISTIC
    assert a.keywords[0] == "pricing" and "the" not in a.keywords and "let's" not in a.keywords
    assert 1 <= len(a.chapters) <= 6
    assert a.chapters[0].start_ms == 0 and a.chapters[-1].end_ms == 290_000
    assert all(x.end_ms <= y.start_ms for x, y in zip(a.chapters, a.chapters[1:]))
    by_text = {d.text: d for d in a.action_items}
    send = by_text["I'll send the revised pricing table by Friday."]
    assert send.segment_index == 1
    assert send.due_date.isoformat() == "2026-10-09"  # "by Friday" after Wednesday 2026-10-07
    assert by_text["We need to check the enterprise plan too."].segment_index == 1
    assert by_text["Action item: update the billing documentation."].segment_index == 3
    assert all("?" not in d.text for d in a.action_items)  # questions are not tasks
    assert "5-minute" in a.overview and "Ann" in a.overview


def test_heuristic_is_deterministic():
    assert HeuristicSummarizer().generate(_segments(), DATE) == HeuristicSummarizer().generate(_segments(), DATE)


def test_heuristic_handles_tiny_transcripts():
    a = HeuristicSummarizer().generate([SegmentInput(0, "Ann", 0, 2000, "Hello there.")], DATE)
    assert len(a.chapters) == 1 and a.overview and a.action_items == []


def test_no_api_key_uses_heuristic(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    assert generate_analysis(_segments(), DATE).generated_by == GeneratedBy.HEURISTIC


def test_claude_response_is_parsed_and_clamped(monkeypatch):
    payload = {
        "overview": "A pricing review.", "keywords": ["Pricing", "billing", "plans", "discounts", "docs"],
        "chapters": [{"title": "Later", "summary": "s2", "start_index": 3, "end_index": 99},
                     {"title": "Start", "summary": "s1", "start_index": 0, "end_index": 2}],
        "action_items": [{"text": "Send pricing table", "segment_index": 1, "due_date": "2026-10-09"},
                         {"text": "Unlinked task", "segment_index": None}, {"text": "  "}],
    }
    monkeypatch.setattr(ClaudeSummarizer, "_complete", lambda self, t: "```json\n" + json.dumps(payload) + "\n```")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    a = generate_analysis(_segments(), DATE)
    assert a.generated_by == GeneratedBy.LLM
    assert [c.title for c in a.chapters] == ["Start", "Later"] and a.chapters[1].end_ms == 290_000
    assert a.keywords[0] == "pricing"
    assert [(d.text, d.segment_index) for d in a.action_items] == [("Send pricing table", 1), ("Unlinked task", None)]


@pytest.mark.parametrize("failure", ["raise", "garbage", "invalid_schema"])
def test_claude_failures_fall_back_to_heuristic(monkeypatch, failure):
    def fake(self, transcript):
        if failure == "raise":
            raise RuntimeError("API down")
        return "not json" if failure == "garbage" else json.dumps({"overview": "x", "keywords": [], "chapters": []})

    monkeypatch.setattr(ClaudeSummarizer, "_complete", fake)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    assert generate_analysis(_segments(), DATE).generated_by == GeneratedBy.HEURISTIC


def test_get_summarizer_selection(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "k")
    assert isinstance(summarizer.get_summarizer(), ClaudeSummarizer)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "  ")
    assert isinstance(summarizer.get_summarizer(), HeuristicSummarizer)


def test_meeting_creation_marks_llm_generated(client, monkeypatch):
    payload = {"overview": "Mock.", "keywords": ["a"], "chapters": [{"title": "T", "summary": "s", "start_index": 0, "end_index": 1}],
               "action_items": [{"text": "Do it", "segment_index": 0}]}
    monkeypatch.setattr(ClaudeSummarizer, "_complete", lambda self, t: json.dumps(payload))
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    d = final(client, client.post("/api/meetings", json={"title": "LLM", "meeting_date": "2026-10-01T10:00:00Z",
                                           "transcript_text": "Ann: Hello there everyone.\nBob: Hi Ann, good morning."}))
    assert d["summary"]["generated_by"] == "llm" and d["action_items"][0]["assignee"]["name"] == "Ann"

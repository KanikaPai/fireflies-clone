import pytest

from app.services import insights as ins
from app.services.insights import SegmentView, whole_percentages


def seg(i, speaker, start, end, text):
    return SegmentView(i, speaker, start, end, text)


def test_talk_time_sums_per_speaker():
    segments = [seg(1, 1, 0, 10_000, "a"), seg(2, 2, 10_000, 14_000, "b"), seg(3, 1, 14_000, 20_000, "c")]
    assert ins.talk_time_ms(segments) == {1: 16_000, 2: 4_000}


def test_words_per_minute_math():
    assert ins.words_per_minute(60, 30_000) == 120  # 60 words in half a minute
    assert ins.words_per_minute(150, 60_000) == 150
    assert ins.words_per_minute(10, 0) == 0


def test_speaker_stats_percentages_wpm_and_order():
    segments = [
        seg(1, 1, 0, 30_000, " ".join(["w"] * 60)),  # 60 words / 0.5 min = 120 wpm
        seg(2, 2, 30_000, 40_000, " ".join(["w"] * 10)),  # 10 words / (1/6) min = 60 wpm
        seg(3, 2, 40_000, 50_000, "x y"),
    ]
    stats = ins.speaker_stats(segments)
    assert [s.speaker_id for s in stats] == [1, 2]
    assert stats[0].talk_time_pct == 60 and stats[1].talk_time_pct == 40
    assert stats[0].wpm == 120 and stats[1].wpm == 36 and stats[1].segment_count == 2
    assert sum(s.talk_time_pct for s in stats) == 100


@pytest.mark.parametrize("values", [{"a": 1, "b": 1, "c": 1}, {"a": 2, "b": 3, "c": 7, "d": 11}, {"a": 5}, {"a": 1, "b": 0}])
def test_whole_percentages_always_sum_to_100(values):
    assert sum(whole_percentages({k: float(v) for k, v in values.items()}).values()) == 100


def test_whole_percentages_zero_input():
    assert whole_percentages({"a": 0.0}) == {"a": 0}


@pytest.mark.parametrize(
    ("detector", "positives", "negatives"),
    [
        (ins.is_question, ["Can you send it?", "What about Friday? Okay."], ["I'll send it."]),
        (ins.has_metric, ["Churn is 73% this year", "We closed 31 points", "It costs $4", "A 3x improvement", "about forty minutes", "one hundred thirty customers", "two point four million dollars"], ["Let's get started", "That sounds good"]),
        (ins.has_date_time, ["Let's meet on Friday", "By next week please", "In October we ship", "Is 3pm okay", "Before the end of the month", "Q4 planning"], ["Thanks everyone", "The fridge is full"]),
        (ins.has_pricing, ["The pricing page needs work", "What does it cost?", "Within budget", "We offer a discount", "That is $5k per seat", "Gross margin fell"], ["Thanks for joining", "We shipped the feature"]),
        (ins.is_task, ["I'll send the report", "We need to confirm the date", "Action item: update the docs", "Let's follow up on that"], ["It was a good week", "Welcome everyone"]),
    ],
)
def test_detectors_on_fixed_examples(detector, positives, negatives):
    assert all(detector(t) for t in positives), [t for t in positives if not detector(t)]
    assert not any(detector(t) for t in negatives), [t for t in negatives if detector(t)]


def test_task_category_includes_segments_linked_to_action_items():
    segments = [seg(1, 1, 0, 1, "Plain statement."), seg(2, 1, 1, 2, "I'll do it.")]
    tasks = next(c for c in ins.filter_categories(segments, {1}) if c.key == "tasks")
    assert tasks.segment_ids == [1, 2] and tasks.count == 2


def test_sentiment_scoring_and_negation():
    assert ins.sentiment_score("This is great, thanks!") == 2
    assert ins.sentiment_score("That is a serious problem and a risk") == -2
    assert ins.sentiment_score("This is not good") == -1  # negated positive
    assert ins.sentiment_score("We have no problem here") == 1  # negated negative
    assert ins.sentiment_score("Let's start the meeting") == 0
    assert ins.sentiment_label(2) == "positive" and ins.sentiment_label(-1) == "negative" and ins.sentiment_label(0) == "neutral"


def test_sentiment_summary_percentages_sum_to_100():
    segments = [seg(1, 1, 0, 1, "great"), seg(2, 1, 1, 2, "a problem"), seg(3, 1, 2, 3, "ok"), seg(4, 1, 3, 4, "fine")]
    s = ins.sentiment_summary(segments)
    assert (s.positive_pct, s.neutral_pct, s.negative_pct) == (25, 50, 25)
    assert [x.label for x in s.by_segment] == ["positive", "negative", "neutral", "neutral"]
    assert ins.sentiment_summary([]).neutral_pct == 100


def test_insights_endpoint_on_seeded_meeting(client):
    mid = client.get("/api/meetings", params={"q": "q3 board"}).json()["items"][0]["id"]
    data = client.get(f"/api/meetings/{mid}/insights").json()
    transcript = client.get(f"/api/meetings/{mid}/transcript").json()["segments"]

    total = sum(s["end_ms"] - s["start_ms"] for s in transcript)
    assert sum(s["talk_time_ms"] for s in data["speakers"]) == total
    assert sum(s["talk_time_pct"] for s in data["speakers"]) == 100
    assert sum(s["segment_count"] for s in data["speakers"]) == len(transcript)
    assert {s["person"]["name"] for s in data["speakers"]} == {s["speaker"]["name"] for s in transcript}
    assert all(s["wpm"] > 0 for s in data["speakers"])

    sent = data["sentiment"]
    assert sent["positive_pct"] + sent["neutral_pct"] + sent["negative_pct"] == 100
    assert len(sent["by_segment"]) == len(transcript)

    filters = {f["key"]: f for f in data["filters"]}
    assert list(filters) == ["date_time", "metrics", "questions", "tasks", "pricing"]
    ids = {s["id"] for s in transcript}
    assert all(set(f["segment_ids"]) <= ids and f["count"] == len(f["segment_ids"]) for f in filters.values())
    questions = {s["id"] for s in transcript if "?" in s["text"]}
    assert set(filters["questions"]["segment_ids"]) == questions
    assert filters["pricing"]["count"] > 0 and filters["metrics"]["count"] > 0  # a board meeting talks money and numbers

    detail = client.get(f"/api/meetings/{mid}").json()
    linked = {a["source_segment_id"] for a in detail["action_items"] if a["source_segment_id"]}
    assert linked <= set(filters["tasks"]["segment_ids"])


def test_insights_404_and_empty_meeting(client):
    assert client.get("/api/meetings/9999/insights").status_code == 404
    empty = client.post("/api/meetings", json={"title": "Empty", "meeting_date": "2026-10-01T10:00:00Z"}).json()
    data = client.get(f"/api/meetings/{empty['id']}/insights").json()
    assert data["speakers"] == [] and data["sentiment"]["neutral_pct"] == 100
    assert all(f["count"] == 0 for f in data["filters"])

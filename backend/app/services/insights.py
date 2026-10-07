"""Meeting insights for the Smart Search panel: speaker stats, transcript filters and sentiment.

Everything here is *computed on read* from the transcript (and action-item links), never stored:
the inputs are small (tens to a few hundred segments), the functions are cheap and pure, and storing
derived data would mean keeping it in sync with every transcript or action-item edit. If transcripts
grow large, cache by (meeting_id, updated_at) instead.

The detectors and the sentiment scorer are deliberately simple heuristics (regexes and a small
lexicon), not ML. They are fast, deterministic and explainable, and are documented as such in the UI.
"""

import re
from collections.abc import Callable, Hashable, Iterable
from dataclasses import dataclass
from typing import TypeVar

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import ActionItem, TranscriptSegment, User
from app.schemas.insights import (
    FilterCategory,
    MeetingInsights,
    SegmentSentiment,
    SentimentSummary,
    SpeakerInsight,
)
from app.schemas.person import PersonBrief
from app.services import meetings
from app.services.summarizer import ACTION_CUES


@dataclass(frozen=True)
class SegmentView:
    """The fields insights need, decoupled from the ORM so the functions are trivially testable."""

    id: int
    speaker_id: int
    start_ms: int
    end_ms: int
    text: str


# --- speakers -------------------------------------------------------------------------------------


def word_count(text: str) -> int:
    return len(text.split())


def talk_time_ms(segments: Iterable[SegmentView]) -> dict[int, int]:
    """Total speaking time per speaker id (sum of segment durations)."""
    totals: dict[int, int] = {}
    for seg in segments:
        totals[seg.speaker_id] = totals.get(seg.speaker_id, 0) + max(0, seg.end_ms - seg.start_ms)
    return totals


def words_per_minute(words: int, talk_ms: int) -> int:
    """Speaking rate: words divided by speaking minutes (0 when the person never spoke)."""
    return round(words / (talk_ms / 60_000)) if talk_ms > 0 else 0


K = TypeVar("K", bound=Hashable)


def whole_percentages(values: dict[K, float]) -> dict[K, int]:
    """Convert values to whole percentages that always sum to exactly 100 (largest-remainder method).

    An all-zero input yields all zeros.
    """
    total = sum(values.values())
    if total <= 0:
        return {key: 0 for key in values}
    exact = {key: value * 100 / total for key, value in values.items()}
    floored = {key: int(share) for key, share in exact.items()}
    leftover = 100 - sum(floored.values())
    by_remainder = sorted(exact, key=lambda key: exact[key] - floored[key], reverse=True)
    for key in by_remainder[:leftover]:
        floored[key] += 1
    return floored


@dataclass(frozen=True)
class SpeakerStats:
    speaker_id: int
    talk_time_ms: int
    talk_time_pct: int
    wpm: int
    segment_count: int


def speaker_stats(segments: list[SegmentView]) -> list[SpeakerStats]:
    """Per-speaker talk time, share, WPM and segment count, most talkative first."""
    times = talk_time_ms(segments)
    pct = whole_percentages({k: float(v) for k, v in times.items()})
    words: dict[int, int] = {}
    counts: dict[int, int] = {}
    for seg in segments:
        words[seg.speaker_id] = words.get(seg.speaker_id, 0) + word_count(seg.text)
        counts[seg.speaker_id] = counts.get(seg.speaker_id, 0) + 1
    stats = [
        SpeakerStats(sid, times[sid], pct[sid], words_per_minute(words[sid], times[sid]), counts[sid]) for sid in times
    ]
    return sorted(stats, key=lambda s: (-s.talk_time_ms, s.speaker_id))


# --- transcript filters ---------------------------------------------------------------------------

_NUMBER_WORDS = (
    r"(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|"
    r"seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)"
)
_METRIC = re.compile(
    rf"""\d[\d,]*(?:\.\d+)?\s?(?:%|x\b|k\b)     # 73%, 3x, 5k
      | \$\s?\d                                   # $4
      | \b\d[\d,]*(?:\.\d+)?\b                    # any bare number
      | \b(?:percent|million|billion|thousand|hundred)\b
      | \b{_NUMBER_WORDS}(?:[- ]{_NUMBER_WORDS})*\s+
        (?:points?|weeks?|months?|days?|hours?|minutes?|dollars?|people|customers?|seats?|engineers?|deals?|screens?|offices?|teams?)\b
    """,
    re.IGNORECASE | re.VERBOSE,
)
_DAYS = r"(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)"
_MONTHS = r"(?:january|february|march|april|may|june|july|august|september|october|november|december)"
_DATE_TIME = re.compile(
    rf"""\b{_DAYS}\b | \b{_MONTHS}\b
      | \b(?:today|tomorrow|yesterday|tonight)\b
      | \b(?:next|last|this)\s+(?:week|month|quarter|sprint|year)\b
      | \bend\s+of\s+(?:the\s+)?(?:day|week|month|quarter|year)\b
      | \bQ[1-4]\b
      | \b\d{{1,2}}(?::\d{{2}})?\s?(?:am|pm)\b
      | \b(?:weeks?|months?)\s+(?:ago|from now)\b
    """,
    re.IGNORECASE | re.VERBOSE,
)
_PRICING = re.compile(
    r"\b(?:pric(?:e|es|ed|ing)|costs?|costing|budget(?:s|ed)?|discounts?|fees?|per[- ]seat|contract|compensation|salary|"
    r"revenue|margin|burn|ARR)\b|\$",
    re.IGNORECASE,
)


def is_question(text: str) -> bool:
    return "?" in text


def has_metric(text: str) -> bool:
    return _METRIC.search(text) is not None


def has_date_time(text: str) -> bool:
    return _DATE_TIME.search(text) is not None


def has_pricing(text: str) -> bool:
    return _PRICING.search(text) is not None


def is_task(text: str) -> bool:
    """A commitment-style sentence (shares its cue phrases with the action-item generator)."""
    return any(cue.search(text) for cue in ACTION_CUES)


FILTERS: list[tuple[str, str, Callable[[str], bool]]] = [
    ("date_time", "Date & Time", has_date_time),
    ("metrics", "Metrics", has_metric),
    ("questions", "Questions", is_question),
    ("tasks", "Tasks", is_task),
    ("pricing", "Pricing", has_pricing),
]


def filter_categories(segments: list[SegmentView], task_segment_ids: set[int]) -> list[FilterCategory]:
    """Segments matching each category. Tasks also include segments linked to action items."""
    categories: list[FilterCategory] = []
    for key, label, detector in FILTERS:
        ids = [
            seg.id
            for seg in segments
            if detector(seg.text) or (key == "tasks" and seg.id in task_segment_ids)
        ]
        categories.append(FilterCategory(key=key, label=label, count=len(ids), segment_ids=ids))
    return categories


# --- sentiment ------------------------------------------------------------------------------------

POSITIVE = frozenset(
    """great good love loved excellent awesome helpful strong perfect thanks thank appreciate glad happy nice positive
    better best improvement improved win easy valuable clear confident exciting impressed fantastic smooth solid
    productive useful pleasant welcome beat ahead healthy""".split()
)
NEGATIVE = frozenset(
    """problem problems issue issues concern concerns concerned worried worry risk risky bad slow sluggish broke broken
    bug bugs fail failed failure blocked stuck frustrating frustrated difficult hard painful leak churn drop dropped
    delay delayed unfortunately wrong late overrun disappointed upset hesitant tight slipped missed lost invasive
    stutters""".split()
)
_NEGATORS = frozenset({"not", "no", "never", "without", "hardly"})
_WORD = re.compile(r"[a-z']+")


def sentiment_score(text: str) -> int:
    """Positive minus negative lexicon hits; a negator within two words before a hit flips its sign.

    A heuristic: no context, sarcasm or domain awareness. Good enough to give a rough tone per segment.
    """
    words = _WORD.findall(text.lower())
    score = 0
    for i, word in enumerate(words):
        polarity = 1 if word in POSITIVE else -1 if word in NEGATIVE else 0
        if not polarity:
            continue
        window = words[max(0, i - 2) : i]
        if any(w in _NEGATORS or w.endswith("n't") for w in window):
            polarity = -polarity
        score += polarity
    return score


def sentiment_label(score: int) -> str:
    return "positive" if score > 0 else "negative" if score < 0 else "neutral"


def sentiment_summary(segments: list[SegmentView]) -> SentimentSummary:
    per_segment = [(seg.id, sentiment_score(seg.text)) for seg in segments]
    counts = {"positive": 0.0, "neutral": 0.0, "negative": 0.0}
    for _, score in per_segment:
        counts[sentiment_label(score)] += 1
    if not segments:
        counts["neutral"] = 1
    pct = whole_percentages(counts)
    return SentimentSummary(
        positive_pct=pct["positive"],
        neutral_pct=pct["neutral"],
        negative_pct=pct["negative"],
        by_segment=[SegmentSentiment(segment_id=sid, label=sentiment_label(s), score=s) for sid, s in per_segment],
    )


# --- orchestration --------------------------------------------------------------------------------


def get_insights(db: Session, user: User, meeting_id: int) -> MeetingInsights:
    meeting = meetings.get_owned_meeting(db, user, meeting_id)
    rows = list(
        db.scalars(
            select(TranscriptSegment)
            .where(TranscriptSegment.meeting_id == meeting.id)
            .order_by(TranscriptSegment.sequence_index)
            .options(joinedload(TranscriptSegment.speaker))
        )
    )
    linked = set(
        db.scalars(
            select(ActionItem.source_segment_id).where(
                ActionItem.meeting_id == meeting.id, ActionItem.source_segment_id.is_not(None)
            )
        )
    )
    segments = [SegmentView(r.id, r.speaker_id, r.start_ms, r.end_ms, r.text) for r in rows]
    people = {r.speaker_id: r.speaker for r in rows}
    return MeetingInsights(
        speakers=[
            SpeakerInsight(
                person=PersonBrief.model_validate(people[s.speaker_id]),
                talk_time_ms=s.talk_time_ms,
                talk_time_pct=s.talk_time_pct,
                wpm=s.wpm,
                segment_count=s.segment_count,
            )
            for s in speaker_stats(segments)
        ],
        filters=filter_categories(segments, linked),
        sentiment=sentiment_summary(segments),
    )

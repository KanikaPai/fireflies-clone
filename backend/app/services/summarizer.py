"""Turn a transcript into a summary, chapters and action items.

Two interchangeable generators sit behind one interface (``Summarizer``):
- ``HeuristicSummarizer``: deterministic and offline (term frequency, time windows, cue phrases).
- ``ClaudeSummarizer``: used when ``ANTHROPIC_API_KEY`` is set; ``generate_analysis`` falls back to
  the heuristic generator on any error.
"""

import json
import logging
import math
import os
import re
from collections import Counter
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Protocol

from pydantic import BaseModel, Field, ValidationError

from app.models import GeneratedBy

logger = logging.getLogger(__name__)

MAX_KEYWORDS = 8
MAX_ACTION_ITEMS = 6
MAX_POINTS_PER_CHAPTER = 3


@dataclass(frozen=True)
class SegmentInput:
    """A transcript segment, decoupled from the ORM so generators are easy to test."""

    index: int
    speaker: str
    start_ms: int
    end_ms: int
    text: str


@dataclass(frozen=True)
class PointDraft:
    text: str
    start_ms: int


@dataclass(frozen=True)
class BulletDraft:
    label: str
    text: str
    start_ms: int


@dataclass(frozen=True)
class ChapterDraft:
    title: str
    summary: str
    start_ms: int
    end_ms: int
    points: list[PointDraft] = field(default_factory=list)


@dataclass(frozen=True)
class ActionItemDraft:
    text: str
    segment_index: int | None  # assignee is the speaker of this segment
    due_date: date | None = None


@dataclass
class Analysis:
    overview: str
    keywords: list[str]
    chapters: list[ChapterDraft]
    action_items: list[ActionItemDraft] = field(default_factory=list)
    bullets: list[BulletDraft] = field(default_factory=list)
    generated_by: GeneratedBy = GeneratedBy.HEURISTIC


class Summarizer(Protocol):
    def generate(self, segments: list[SegmentInput], meeting_date: datetime) -> Analysis: ...


# --- heuristic generator --------------------------------------------------------------------------

_STOPWORDS = set(
    """a about above after again all also am an and any are aren't as at be because been before being below
    between both but by can can't cannot could couldn't did didn't do does doesn't doing don't down during each
    few for from further get gets got had hadn't has hasn't have haven't having he her here hers him his how i i'd
    i'll i'm i've if in into is isn't it it's its itself let let's like me more most my myself no nor not of off
    okay ok on once only or other our ours out over own same she should shouldn't so some such than that that's
    the their theirs them then there there's these they they'd they'll they're they've this those through to too
    under until up us very was wasn't we we'd we'll we're we've were weren't what what's when where which while
    who whom why will with won't would wouldn't you you'd you'll you're you've your yours yourself
    yeah yes right just really going gonna think know want need thing things kind lot much many one two
    make made way well see sure good great actually maybe still back come take say said look
    something someone anything everyone sounds thanks thank honestly basically probably anyone
    three four five six seven eight nine ten twenty thirty forty fifty hundred first second third next last""".split()
)
_WORD = re.compile(r"[a-z][a-z']{2,}")
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")
_LEADING_FILLER = re.compile(r"^(?:okay|ok|so|yeah|yes|right|well|alright|and|but|then)[,.]?\s+", re.IGNORECASE)

ACTION_CUES = [
    re.compile(r"\bi(?:'ll| will| can take|'m going to| am going to)\b", re.IGNORECASE),
    re.compile(r"\bwe (?:need|have|should|must) to\b", re.IGNORECASE),
    re.compile(r"\b(?:you|they|he|she|i) need to\b", re.IGNORECASE),
    re.compile(r"\baction items?\b", re.IGNORECASE),
    re.compile(r"\bfollow(?:ing)?[- ]up\b", re.IGNORECASE),
    re.compile(r"\b(?:make sure|let's make sure)\b", re.IGNORECASE),
]
_WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
_DEADLINE = re.compile(
    r"\b(?:by|before|until)\s+(?:next\s+)?(?P<when>monday|tuesday|wednesday|thursday|friday|saturday|sunday|"
    r"tomorrow|end of (?:the )?(?:day|week|month)|eod|eow)\b",
    re.IGNORECASE,
)


def _tokens(text: str) -> list[str]:
    return [w.strip("'") for w in _WORD.findall(text.lower()) if w.strip("'") not in _STOPWORDS]


def _title_case(words: list[str]) -> str:
    cap = [w.capitalize() for w in words]
    if len(cap) <= 1:
        return "".join(cap)
    return ", ".join(cap[:-1]) + " & " + cap[-1]


def _truncate(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0].rstrip(",;:") + "…"


def _parse_deadline(sentence: str, meeting_date: datetime) -> date | None:
    m = _DEADLINE.search(sentence)
    if not m:
        return None
    when = m["when"].lower()
    today = meeting_date.date()
    if when == "tomorrow":
        return today + timedelta(days=1)
    if when in ("eod", "end of day", "end of the day"):
        return today
    if when in ("eow", "end of week", "end of the week"):
        return today + timedelta(days=(4 - today.weekday()) % 7 or 7)
    if when.startswith("end of"):  # end of (the) month
        first_next = (today.replace(day=28) + timedelta(days=4)).replace(day=1)
        return first_next - timedelta(days=1)
    return today + timedelta(days=(_WEEKDAYS.index(when) - today.weekday()) % 7 or 7)


class HeuristicSummarizer:
    generated_by = GeneratedBy.HEURISTIC

    def generate(self, segments: list[SegmentInput], meeting_date: datetime) -> Analysis:
        keywords = self._keywords(segments)
        chapters, bullets = self._chapters(segments)
        actions = self._action_items(segments, meeting_date)
        overview = self._overview(segments, keywords, chapters, actions)
        return Analysis(overview, keywords, chapters, actions, bullets, self.generated_by)

    def _keywords(self, segments: list[SegmentInput]) -> list[str]:
        counts = Counter(t for s in segments for t in _tokens(s.text))
        ranked = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
        return [w for w, _ in ranked[:MAX_KEYWORDS]]

    def _windows(self, segments: list[SegmentInput]) -> list[list[SegmentInput]]:
        """Split the transcript into 3-6 contiguous, non-empty windows of roughly equal duration."""
        t0, t1 = segments[0].start_ms, segments[-1].end_ms
        minutes = (t1 - t0) / 60_000
        n = max(1, min(len(segments), max(3, min(6, round(minutes / 4)))))
        span = max(1, t1 - t0) / n
        windows: list[list[SegmentInput]] = [[] for _ in range(n)]
        for seg in segments:
            windows[min(n - 1, int((seg.start_ms - t0) / span))].append(seg)
        return [w for w in windows if w]

    def _chapters(self, segments: list[SegmentInput]) -> tuple[list[ChapterDraft], list[BulletDraft]]:
        windows = self._windows(segments)
        window_tf = [Counter(t for s in w for t in _tokens(s.text)) for w in windows]
        doc_freq = Counter(term for tf in window_tf for term in tf)
        n = len(windows)
        chapters: list[ChapterDraft] = []
        bullets: list[BulletDraft] = []
        used_titles: set[str] = set()
        for window, tf in zip(windows, window_tf):
            scored = sorted(
                ((c * (math.log((1 + n) / (1 + doc_freq[t])) + 1), t) for t, c in tf.items()),
                key=lambda x: (-x[0], x[1]),
            )
            top = [t for _, t in scored[:3]] or ["discussion"]
            title = _title_case(top)
            if title in used_titles and len(scored) > 3:  # avoid duplicate titles when possible
                top = [t for _, t in scored[1:4]]
                title = _title_case(top)
            used_titles.add(title)

            ranked = self._ranked_sentences(window, set(top))  # best first: (score, start_ms, sentence)
            chronological = sorted(ranked[:MAX_POINTS_PER_CHAPTER], key=lambda r: r[1])
            paragraph = " ".join(sentence for _, _, sentence in sorted(ranked[:2], key=lambda r: r[1]))
            chapters.append(
                ChapterDraft(
                    title,
                    _truncate(paragraph, 320) if paragraph else f"Discussion of {', '.join(sorted(top))}.",
                    window[0].start_ms,
                    window[-1].end_ms,
                    [PointDraft(_truncate(sentence, 170), start) for _, start, sentence in chronological],
                )
            )
            if ranked:  # one bullet per chapter: its most informative sentence, linked to where it was said
                _, start, sentence = ranked[0]
                bullets.append(BulletDraft(title, _truncate(sentence, 180), start))
        return chapters, bullets

    @staticmethod
    def _ranked_sentences(window: list[SegmentInput], topic_words: set[str]) -> list[tuple[int, int, str]]:
        """Sentences of a window scored by how many topic words they contain, best first."""
        ranked: list[tuple[int, int, str]] = []
        for seg in window:
            for sentence in _SENTENCE_SPLIT.split(seg.text):
                sentence = sentence.strip()
                if len(sentence.split()) < 5 or sentence.endswith("?"):
                    continue
                ranked.append((sum(1 for t in _tokens(sentence) if t in topic_words), seg.start_ms, sentence))
        return sorted(ranked, key=lambda r: (-r[0], r[1]))

    def _action_items(self, segments: list[SegmentInput], meeting_date: datetime) -> list[ActionItemDraft]:
        candidates: list[tuple[int, int, ActionItemDraft]] = []  # (score, order, draft)
        seen: set[str] = set()
        for seg in segments:
            for sentence in _SENTENCE_SPLIT.split(seg.text):
                sentence = _LEADING_FILLER.sub("", sentence.strip())
                if sentence.endswith("?") or len(sentence.split()) < 4:
                    continue
                deadline = _parse_deadline(sentence, meeting_date)
                score = sum(1 for cue in ACTION_CUES if cue.search(sentence)) + (1 if deadline else 0)
                key = re.sub(r"\W+", " ", sentence.lower()).strip()
                if score == 0 or key in seen:
                    continue
                seen.add(key)
                text = _truncate(sentence[0].upper() + sentence[1:], 220)
                candidates.append((score, len(candidates), ActionItemDraft(text, seg.index, deadline)))
        best = sorted(candidates, key=lambda c: (-c[0], c[1]))[:MAX_ACTION_ITEMS]
        return [draft for _, _, draft in sorted(best, key=lambda c: c[1])]

    @staticmethod
    def _overview(
        segments: list[SegmentInput], keywords: list[str], chapters: list[ChapterDraft], actions: list[ActionItemDraft]
    ) -> str:
        minutes = max(1, round((segments[-1].end_ms - segments[0].start_ms) / 60_000))
        speakers = list(dict.fromkeys(s.speaker for s in segments))
        who = speakers[0] if len(speakers) == 1 else ", ".join(speakers[:-1]) + f" and {speakers[-1]}"
        parts = [f"This {minutes}-minute conversation involved {who}."]
        if keywords:
            parts.append(f"The main topics were {', '.join(keywords[:3])}.")
        if len(chapters) > 1:
            parts.append(
                "It moved through " + "; ".join(c.title.lower() for c in chapters[:4]) + "."
            )
        if actions:
            by = {s.index: s.speaker for s in segments}
            first = actions[0]
            parts.append(
                f"{len(actions)} action item{'s were' if len(actions) != 1 else ' was'} identified, "
                f"starting with {by.get(first.segment_index, 'someone')}: “{_truncate(first.text, 100)}”"
            )
        else:
            parts.append("No explicit action items were detected.")
        return " ".join(parts)


# --- Claude generator -----------------------------------------------------------------------------

DEFAULT_MODEL = "claude-sonnet-5-5"
MAX_TRANSCRIPT_CHARS = 150_000

_SYSTEM_PROMPT = """You analyse meeting transcripts. Reply with a single JSON object and nothing else, with keys:
"overview": string (3-5 sentences),
"keywords": array of 5-8 short lowercase strings,
"bullets": array of 5-7 objects {"label": short topic, "text": one sentence, "segment_index": int} that summarise
  the meeting, in order, where segment_index is the segment where it is discussed,
"chapters": array of 3-6 objects {"title": string, "summary": a short paragraph, "start_index": int, "end_index": int,
  "points": 2-4 objects {"text": one sentence, "segment_index": int}} covering the transcript in order,
  using the [index] numbers of segments,
"action_items": array of up to 6 objects {"text": string, "segment_index": int, "due_date": "YYYY-MM-DD" or null}
  where segment_index is the segment in which the task was committed to (its speaker becomes the assignee).
Only include action items that were actually committed to in the transcript."""


class _LLMPoint(BaseModel):
    text: str
    segment_index: int


class _LLMBullet(BaseModel):
    label: str
    text: str
    segment_index: int


class _LLMChapter(BaseModel):
    title: str
    summary: str = ""
    start_index: int
    end_index: int
    points: list[_LLMPoint] = Field(default_factory=list)


class _LLMAction(BaseModel):
    text: str
    segment_index: int | None = None
    due_date: date | None = None


class _LLMAnalysis(BaseModel):
    overview: str = Field(min_length=1)
    keywords: list[str] = Field(min_length=1)
    bullets: list[_LLMBullet] = Field(default_factory=list)
    chapters: list[_LLMChapter] = Field(min_length=1)
    action_items: list[_LLMAction] = Field(default_factory=list)


def _format_transcript(segments: list[SegmentInput]) -> str:
    lines: list[str] = []
    total = 0
    for s in segments:
        line = f"[{s.index}] {s.speaker} ({s.start_ms // 60000}:{s.start_ms // 1000 % 60:02d}): {s.text}"
        total += len(line) + 1
        if total > MAX_TRANSCRIPT_CHARS:
            lines.append("[transcript truncated]")
            break
        lines.append(line)
    return "\n".join(lines)


class ClaudeSummarizer:
    generated_by = GeneratedBy.LLM

    def __init__(self, api_key: str, model: str = DEFAULT_MODEL) -> None:
        self.api_key, self.model = api_key, model

    def _complete(self, transcript: str) -> str:
        import anthropic  # imported lazily so the heuristic path never needs the SDK

        client = anthropic.Anthropic(api_key=self.api_key, timeout=60.0)
        message = client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": f"Transcript:\n{transcript}"}],
        )
        return "".join(block.text for block in message.content if block.type == "text")

    def generate(self, segments: list[SegmentInput], meeting_date: datetime) -> Analysis:
        raw = self._complete(_format_transcript(segments)).strip()
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw)
        try:
            data = _LLMAnalysis.model_validate(json.loads(raw))
        except (json.JSONDecodeError, ValidationError) as exc:
            raise ValueError(f"Model returned an unusable response: {exc}") from exc

        last = len(segments) - 1
        clamp = lambda i: max(0, min(last, i))  # noqa: E731
        chapters = []
        for ch in sorted(data.chapters, key=lambda c: c.start_index):
            first, final = clamp(ch.start_index), clamp(ch.end_index)
            points = sorted((PointDraft(p.text.strip(), segments[clamp(p.segment_index)].start_ms) for p in ch.points if p.text.strip()), key=lambda p: p.start_ms)
            chapters.append(
                ChapterDraft(ch.title.strip(), ch.summary.strip(), segments[first].start_ms, segments[max(first, final)].end_ms, points)
            )
        bullets = sorted(
            (BulletDraft(b.label.strip(), b.text.strip(), segments[clamp(b.segment_index)].start_ms) for b in data.bullets if b.text.strip()),
            key=lambda b: b.start_ms,
        ) or [BulletDraft(c.title, c.summary, c.start_ms) for c in chapters]  # fall back to chapters if the model omitted bullets
        actions = [
            ActionItemDraft(a.text.strip(), None if a.segment_index is None else clamp(a.segment_index), a.due_date)
            for a in data.action_items[:MAX_ACTION_ITEMS]
            if a.text.strip()
        ]
        return Analysis(
            data.overview.strip(), [k.strip().lower() for k in data.keywords[:MAX_KEYWORDS]], chapters, actions, bullets, self.generated_by
        )


# --- entry point ----------------------------------------------------------------------------------


def get_summarizer() -> Summarizer:
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if api_key:
        return ClaudeSummarizer(api_key, os.getenv("ANTHROPIC_MODEL", DEFAULT_MODEL))
    return HeuristicSummarizer()


def generate_analysis(segments: list[SegmentInput], meeting_date: datetime) -> Analysis:
    """Generate with Claude when configured, falling back to the heuristic generator on any error."""
    summarizer = get_summarizer()
    if isinstance(summarizer, ClaudeSummarizer):
        try:
            return summarizer.generate(segments, meeting_date)
        except Exception:  # noqa: BLE001 - any failure (network, auth, bad JSON) must not block meeting creation
            logger.warning("Claude summarisation failed; using heuristic generator", exc_info=True)
    return HeuristicSummarizer().generate(segments, meeting_date)

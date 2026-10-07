"""Ranked retrieval over one meeting's transcript: SQLite FTS5 BM25 plus small boosts, with synonym expansion."""

import math
from dataclasses import dataclass

from sqlalchemy import text

from app.schemas.summary import ChapterOut, SummaryBullet
from app.schemas.transcript import SegmentOut
from app.services import fts

from .common import Meeting, words
from .terms import content_words, stem, stems_of, surface_synonyms, synonyms_of

MAX_CANDIDATES = 60
SYNONYM_WEIGHT = 0.6  # a synonym hit counts for less than the word the user typed
PHRASE_BOOST = 0.25  # two adjacent question words appear adjacent in the segment
BULLET_BOOST = 0.2  # the segment sits at a summary bullet that matches the question
CHAPTER_BOOST = 0.1  # the segment sits inside a chapter whose title/summary matches
BULLET_WINDOW_MS = (-15_000, 30_000)

_BM25 = text(
    """
    SELECT s.id AS id, bm25(transcript_fts) AS rank
    FROM transcript_fts
    JOIN transcript_segments s ON s.id = transcript_fts.rowid
    WHERE transcript_fts MATCH :match AND s.meeting_id = :meeting_id
    ORDER BY rank
    LIMIT :limit
    """
)


@dataclass(frozen=True)
class Query:
    """A question reduced to what retrieval needs."""

    words: list[str]  # content words as typed (lowercase, no stopwords)
    stems: list[str]  # their stems, same order
    synonyms: dict[str, set[str]]  # stem -> stems of its synonyms
    phrases: list[tuple[str, str]]  # adjacent content-word stem pairs from the question

    @property
    def match_stems(self) -> set[str]:
        return set(self.stems) | {s for syns in self.synonyms.values() for s in syns}


@dataclass(frozen=True)
class Hit:
    segment: SegmentOut
    score: float


def build_query(question: str, exclude: frozenset[str] = frozenset()) -> Query:
    ws = content_words(question, exclude)
    stems = list(dict.fromkeys(stem(w) for w in ws))
    sequence = [stem(w) for w in content_words_in_order(question, exclude)]
    phrases = [(a, b) for a, b in zip(sequence, sequence[1:], strict=False) if a != b]
    return Query(ws, stems, {s: synonyms_of(s) for s in stems}, phrases)


def content_words_in_order(question: str, exclude: frozenset[str]) -> list[str]:
    """Content words in question order, keeping repeats (so adjacency can be checked)."""
    keep = set(content_words(question, exclude))
    return [w.replace("'", "") for w in words(question) if w.removesuffix("'s").replace("'", "") in keep]


def _bm25(db_match: str | None, meeting: Meeting) -> dict[int, float]:
    if db_match is None:
        return {}
    rows = meeting.db.execute(_BM25, {"match": db_match, "meeting_id": meeting.detail.id, "limit": MAX_CANDIDATES})
    return {row.id: -row.rank for row in rows}  # FTS5 bm25() is lower-is-better (negative); flip it


def _note_matches(stems: set[str], note_text: str) -> bool:
    return bool(stems & set(stems_of(note_text)))


def is_direct(bullet: SummaryBullet, query: Query) -> bool:
    """True when the bullet contains a word of the question itself (not just a synonym)."""
    return bool(set(query.stems) & set(stems_of(f"{bullet.label} {bullet.text}")))


def matching_bullets(meeting: Meeting, query: Query) -> list[SummaryBullet]:
    """Summary bullets that mention the question's words (most words first), then those that only share a synonym."""
    summary = meeting.detail.summary
    if summary is None:
        return []
    direct: list[tuple[int, int, SummaryBullet]] = []
    related: list[SummaryBullet] = []
    for b in summary.bullets:
        words_in = set(stems_of(f"{b.label} {b.text}"))
        count = len(set(query.stems) & words_in)
        if count:
            direct.append((-count, b.start_ms, b))
        elif query.match_stems & words_in:
            related.append(b)
    return [b for _, _, b in sorted(direct, key=lambda x: (x[0], x[1]))] + sorted(related, key=lambda b: b.start_ms)


def matching_chapters(meeting: Meeting, query: Query) -> list[ChapterOut]:
    stems = query.match_stems
    return [c for c in meeting.detail.chapters if _note_matches(stems, f"{c.title} {c.summary or ''}")]


def _needed(query: Query) -> int:
    return math.ceil(len(query.stems) / 2)


def _coverage(segment_stems: set[str], query: Query) -> int:
    return sum(1 for s in query.stems if s in segment_stems or query.synonyms[s] & segment_stems)


def search(meeting: Meeting, query: Query, limit: int = 3) -> list[Hit]:
    """The best `limit` segments for the question, or [] when nothing is relevant enough.

    Score = BM25 of the typed words + 0.6 x BM25 of their synonyms, normalised to 0..1, plus small boosts for an
    adjacent-word phrase match and for sitting at a matching summary bullet / chapter. A segment must also contain
    at least half of the question's words (or their synonyms) to count at all.
    """
    if not query.stems:
        return []
    direct = _bm25(fts.build_any_query(query.words), meeting)
    synonym_words = {w for word in query.words for w in surface_synonyms(word)} - set(query.words)
    related = _bm25(fts.build_any_query(sorted(synonym_words)), meeting)
    raw = {sid: direct.get(sid, 0.0) + SYNONYM_WEIGHT * related.get(sid, 0.0) for sid in direct.keys() | related.keys()}
    if not raw:
        return []
    top = max(raw.values()) or 1.0
    by_id = meeting.by_id
    bullets = matching_bullets(meeting, query)
    chapters = matching_chapters(meeting, query)

    hits = []
    for sid, value in raw.items():
        segment = by_id.get(sid)
        if segment is None:
            continue
        seg_stems = stems_of(segment.text)
        if _coverage(set(seg_stems), query) < _needed(query):
            continue
        score = value / top
        pairs = set(zip(seg_stems, seg_stems[1:], strict=False))
        if any(p in pairs for p in query.phrases):
            score += PHRASE_BOOST
        if any(b.start_ms + BULLET_WINDOW_MS[0] <= segment.start_ms <= b.start_ms + BULLET_WINDOW_MS[1] for b in bullets[:3]):
            score += BULLET_BOOST
        if any(c.start_ms <= segment.start_ms < c.end_ms for c in chapters):
            score += CHAPTER_BOOST
        hits.append(Hit(segment, score))
    hits.sort(key=lambda h: (-h.score, h.segment.start_ms))
    return hits[:limit]

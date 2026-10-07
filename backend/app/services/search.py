"""Global search: FTS5 over transcript text plus a title match, grouped by meeting."""

import html
import re
from dataclasses import dataclass, field

from sqlalchemy import String, and_, cast, select, text
from sqlalchemy.orm import Session

from app.models import ActionItem, Meeting, Person, Summary, User
from app.schemas.person import PersonBrief
from app.schemas.search import SearchActionItem, SearchBullet, SearchMatch, SearchMeeting, SearchResponse, SearchResult
from app.services import fts

_OPEN, _CLOSE = "\x02", "\x03"  # sentinels that cannot occur in the text; swapped for <mark> after escaping
_MAX_ROWS = 1000

_SQL = text(
    f"""
    SELECT s.id, s.meeting_id, s.start_ms, s.speaker_id,
           snippet(transcript_fts, 0, char(2), char(3), '…', 16) AS snip
    FROM transcript_fts
    JOIN transcript_segments s ON s.id = transcript_fts.rowid
    JOIN meetings m ON m.id = s.meeting_id
    WHERE transcript_fts MATCH :match AND m.owner_id = :owner
    ORDER BY bm25(transcript_fts)
    LIMIT {_MAX_ROWS}
    """
)


@dataclass
class _Hit:
    segment_id: int
    start_ms: int
    speaker_id: int
    snippet: str


@dataclass
class _Group:
    hits: list[_Hit] = field(default_factory=list)


def _safe_snippet(raw: str) -> str:
    return html.escape(raw, quote=False).replace(_OPEN, "<mark>").replace(_CLOSE, "</mark>")


def _highlight(raw: str, terms: list[str]) -> str:
    """HTML-escape `raw` and wrap case-insensitive term matches in <mark>. Escaping is applied piecewise, so a
    term can never match inside an entity such as ``&amp;``."""
    pattern = re.compile("|".join(re.escape(t) for t in sorted(terms, key=len, reverse=True)), re.IGNORECASE)
    out: list[str] = []
    last = 0
    for m in pattern.finditer(raw):
        out.append(html.escape(raw[last : m.start()], quote=False))
        out.append(f"<mark>{html.escape(m.group(0), quote=False)}</mark>")
        last = m.end()
    out.append(html.escape(raw[last:], quote=False))
    return "".join(out)


def _snippet_around(raw: str, terms: list[str], width: int = 160) -> str:
    """Trim long text to a window around the first match (the window is cut on raw text, then highlighted)."""
    if len(raw) <= width:
        return _highlight(raw, terms)
    first = re.search("|".join(re.escape(t) for t in terms), raw, re.IGNORECASE)
    start = max(0, (first.start() if first else 0) - width // 3)
    end = min(len(raw), start + width)
    return ("…" if start else "") + _highlight(raw[start:end], terms) + ("…" if end < len(raw) else "")


def _contains_all(haystack: str, terms: list[str]) -> bool:
    lowered = haystack.lower()
    return all(t.lower() in lowered for t in terms)


def _search_action_items(
    db: Session, user: User, terms: list[str], per_category: int
) -> tuple[list[SearchActionItem], int]:
    rows = list(
        db.scalars(
            select(ActionItem)
            .join(Meeting, Meeting.id == ActionItem.meeting_id)
            .where(Meeting.owner_id == user.id, *(ActionItem.text.ilike(f"%{_like_escape(t)}%", escape="\\") for t in terms))
            .order_by(Meeting.meeting_date.desc(), ActionItem.id)
        )
    )
    items = [
        SearchActionItem(
            id=a.id,
            meeting=SearchMeeting.model_validate(a.meeting, from_attributes=True),
            text=a.text,
            snippet=_snippet_around(a.text, terms),
            is_completed=a.is_completed,
            assignee=PersonBrief.model_validate(a.assignee) if a.assignee else None,
            source_start_ms=a.source_segment.start_ms if a.source_segment else None,
        )
        for a in rows[:per_category]
    ]
    return items, len(rows)


def _search_bullets(db: Session, user: User, terms: list[str], per_category: int) -> tuple[list[SearchBullet], int]:
    # Bullets live in a JSON column; narrow with a cheap text pre-filter, then check every term in Python.
    query = select(Summary).join(Meeting, Meeting.id == Summary.meeting_id).where(Meeting.owner_id == user.id)
    if terms[0].isascii():  # the JSON column stores non-ASCII as \\uXXXX escapes, so only ASCII terms can be pre-filtered
        query = query.where(cast(Summary.bullets, String).ilike(f"%{_like_escape(terms[0])}%", escape="\\"))
    summaries = db.scalars(query.order_by(Meeting.meeting_date.desc()))
    found: list[SearchBullet] = []
    for summary in summaries:
        for bullet in summary.bullets or []:
            combined = f"{bullet['label']}: {bullet['text']}"
            if _contains_all(combined, terms):
                found.append(
                    SearchBullet(
                        meeting=SearchMeeting.model_validate(summary.meeting, from_attributes=True),
                        label=bullet["label"],
                        snippet=_snippet_around(combined, terms),
                        start_ms=bullet["start_ms"],
                    )
                )
    return found[:per_category], len(found)


def _like_escape(term: str) -> str:
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def search(
    db: Session, user: User, q: str, *, limit: int = 20, matches_per_meeting: int = 3, per_category: int = 10
) -> SearchResponse:
    terms = fts.tokenize(q)
    match = fts.build_match_query(q)
    if not match:
        return SearchResponse(query=q, total_meetings=0, results=[])

    # Meetings whose title contains every term (case-insensitive).
    title_ids = list(
        db.scalars(
            select(Meeting.id)
            .where(and_(Meeting.owner_id == user.id, *(Meeting.title.ilike(f"%{t}%") for t in terms)))
            .order_by(Meeting.meeting_date.desc())
        )
    )
    # Transcript matches, best BM25 rank first, grouped by meeting (dict preserves rank order).
    groups: dict[int, _Group] = {}
    match_counts: dict[int, int] = {}
    for seg_id, meeting_id, start_ms, speaker_id, snip in db.execute(_SQL, {"match": match, "owner": user.id}):
        match_counts[meeting_id] = match_counts.get(meeting_id, 0) + 1
        group = groups.setdefault(meeting_id, _Group())
        if len(group.hits) < matches_per_meeting:
            group.hits.append(_Hit(seg_id, start_ms, speaker_id, _safe_snippet(snip)))

    ordered_ids = list(dict.fromkeys([*title_ids, *groups]))[:limit]
    meetings = {m.id: m for m in db.scalars(select(Meeting).where(Meeting.id.in_(ordered_ids)))}
    speakers = {
        p.id: p
        for p in db.scalars(select(Person).where(Person.id.in_({h.speaker_id for g in groups.values() for h in g.hits})))
    }
    title_set = set(title_ids)
    results = [
        SearchResult(
            meeting=SearchMeeting.model_validate(meetings[mid], from_attributes=True),
            title_match=mid in title_set,
            match_count=match_counts.get(mid, 0),
            matches=[
                SearchMatch(
                    segment_id=h.segment_id,
                    start_ms=h.start_ms,
                    speaker=PersonBrief.model_validate(speakers[h.speaker_id]),
                    snippet=h.snippet,
                )
                for h in groups.get(mid, _Group()).hits
            ],
        )
        for mid in ordered_ids
    ]
    action_items, action_items_total = _search_action_items(db, user, terms, per_category)
    bullets, bullets_total = _search_bullets(db, user, terms, per_category)
    return SearchResponse(
        query=q,
        total_meetings=len(results),
        results=results,
        action_items=action_items,
        action_items_total=action_items_total,
        summary_bullets=bullets,
        summary_bullets_total=bullets_total,
    )

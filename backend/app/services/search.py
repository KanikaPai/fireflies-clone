"""Global search: FTS5 over transcript text plus a title match, grouped by meeting."""

import html
from dataclasses import dataclass, field

from sqlalchemy import and_, select, text
from sqlalchemy.orm import Session

from app.models import Meeting, Person, User
from app.schemas.person import PersonBrief
from app.schemas.search import SearchMatch, SearchMeeting, SearchResponse, SearchResult
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


def search(
    db: Session, user: User, q: str, *, limit: int = 20, matches_per_meeting: int = 3
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
    return SearchResponse(query=q, total_meetings=len(results), results=results)

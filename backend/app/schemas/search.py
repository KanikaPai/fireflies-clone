from pydantic import BaseModel

from app.models import Platform
from app.schemas.common import UtcDatetime
from app.schemas.person import PersonBrief


class SearchMatch(BaseModel):
    segment_id: int
    start_ms: int
    speaker: PersonBrief
    snippet: str  # HTML-safe: text is escaped and matched words are wrapped in <mark>…</mark>


class SearchMeeting(BaseModel):
    id: int
    title: str
    meeting_date: UtcDatetime
    platform: Platform


class SearchResult(BaseModel):
    meeting: SearchMeeting
    title_match: bool
    match_count: int
    matches: list[SearchMatch]


class SearchActionItem(BaseModel):
    id: int
    meeting: SearchMeeting
    text: str
    snippet: str  # HTML-safe, matches wrapped in <mark>
    is_completed: bool
    assignee: PersonBrief | None
    source_start_ms: int | None


class SearchBullet(BaseModel):
    """A match inside a meeting's summary notes (one timestamped bullet)."""

    meeting: SearchMeeting
    label: str
    snippet: str  # HTML-safe "Label: text" with matches wrapped in <mark>
    start_ms: int


class SearchResponse(BaseModel):
    query: str
    total_meetings: int
    results: list[SearchResult]
    # Category-tagged extras, each capped at `per_category`; the totals count all matches.
    action_items: list[SearchActionItem] = []
    action_items_total: int = 0
    summary_bullets: list[SearchBullet] = []
    summary_bullets_total: int = 0

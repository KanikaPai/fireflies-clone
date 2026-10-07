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


class SearchResponse(BaseModel):
    query: str
    total_meetings: int
    results: list[SearchResult]

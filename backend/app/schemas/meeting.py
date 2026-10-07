
from pydantic import BaseModel, Field

from app.models import MeetingStatus, ParticipantRole, Platform
from app.schemas.action_item import ActionItemOut
from app.schemas.common import ORMModel, UtcDatetime
from app.schemas.person import PersonBrief
from app.schemas.summary import ChapterOut, SummaryOut
from app.schemas.tag import TagOut


class MeetingListItem(ORMModel):
    id: int
    title: str
    meeting_date: UtcDatetime
    duration_seconds: int
    platform: Platform
    status: MeetingStatus
    participants: list[PersonBrief]
    tags: list[TagOut]
    action_item_count: int
    open_action_item_count: int


class MeetingPage(BaseModel):
    items: list[MeetingListItem]
    total: int
    page: int
    page_size: int


class ParticipantOut(PersonBrief):
    email: str | None
    role: ParticipantRole


class MeetingDetail(ORMModel):
    id: int
    title: str
    meeting_date: UtcDatetime
    duration_seconds: int
    platform: Platform
    status: MeetingStatus
    media_url: str | None
    created_at: UtcDatetime
    updated_at: UtcDatetime
    participants: list[ParticipantOut]
    tags: list[TagOut]
    summary: SummaryOut | None
    chapters: list[ChapterOut]
    action_items: list[ActionItemOut]


class MeetingCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    meeting_date: UtcDatetime
    participants: list[str] = Field(default_factory=list, description="Participant names; existing people are reused")
    platform: Platform = Platform.UPLOAD
    transcript_text: str | None = Field(
        default=None, description="Pasted transcript in the .txt format ('[mm:ss] Speaker: text')"
    )


class MeetingUpdate(BaseModel):
    """Partial update; participant_ids and tag_ids, when present, replace the current sets."""

    title: str | None = Field(default=None, min_length=1, max_length=255)
    meeting_date: UtcDatetime | None = None
    participant_ids: list[int] | None = None
    tag_ids: list[int] | None = None

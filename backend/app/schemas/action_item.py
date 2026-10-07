from datetime import date

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel, UtcDatetime
from app.schemas.person import PersonBrief


class ActionItemOut(ORMModel):
    id: int
    meeting_id: int
    text: str
    assignee: PersonBrief | None
    source_segment_id: int | None
    source_start_ms: int | None
    is_completed: bool
    due_date: date | None
    created_at: UtcDatetime
    updated_at: UtcDatetime


class ActionItemCreate(BaseModel):
    text: str = Field(min_length=1, max_length=1000)
    assignee_id: int | None = None
    source_segment_id: int | None = None
    is_completed: bool = False
    due_date: date | None = None


class ActionItemUpdate(BaseModel):
    """Partial update: only fields present in the request body are changed (null clears nullable fields)."""

    text: str | None = Field(default=None, min_length=1, max_length=1000)
    assignee_id: int | None = None
    source_segment_id: int | None = None
    is_completed: bool | None = None
    due_date: date | None = None


class ActionItemWithMeeting(ActionItemOut):
    """An action item together with the meeting it came from (for the cross-meeting Tasks view)."""

    meeting_title: str
    meeting_date: UtcDatetime

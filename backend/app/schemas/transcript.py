from pydantic import BaseModel, Field, StringConstraints
from typing import Annotated

from app.schemas.common import ORMModel
from app.schemas.person import PersonBrief


class SegmentOut(ORMModel):
    id: int
    sequence_index: int
    start_ms: int
    end_ms: int
    text: str
    speaker: PersonBrief


class TranscriptOut(ORMModel):
    meeting_id: int
    segments: list[SegmentOut]
    # Present only when ?q= was given: ids of the segments matching the query.
    matching_segment_ids: list[int] | None = None


class SegmentUpdate(BaseModel):
    """Partial update of one segment. Timings are never edited."""

    text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)] | None = None
    speaker_id: int | None = None


class ReplaceRequest(BaseModel):
    find: str = Field(min_length=1, max_length=200)
    replace: str = Field(max_length=200)
    case_sensitive: bool = False
    segment_ids: list[int] | None = Field(default=None, description="Limit the replacement to these segments")


class ReplaceResult(BaseModel):
    replaced: int
    segment_ids: list[int]


class ReassignRequest(BaseModel):
    from_person_id: int
    to_person_id: int


class ReassignResult(BaseModel):
    reassigned: int

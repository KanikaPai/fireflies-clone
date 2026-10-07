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

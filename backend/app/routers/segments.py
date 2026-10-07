from fastapi import APIRouter

from app.deps import CurrentUser, DbSession
from app.schemas.transcript import SegmentOut, SegmentUpdate
from app.services import transcript_edit

router = APIRouter(prefix="/api/segments", tags=["transcript"])


@router.patch(
    "/{segment_id}",
    response_model=SegmentOut,
    summary="Edit a segment's text or speaker",
    description="Empty text is rejected (422). The speaker must be a participant of the meeting (422).",
)
def update_segment(segment_id: int, data: SegmentUpdate, db: DbSession, user: CurrentUser) -> SegmentOut:
    return transcript_edit.update_segment(db, user, segment_id, data)

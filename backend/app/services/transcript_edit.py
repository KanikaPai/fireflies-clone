"""Editing transcript text and speakers. Timings are never changed, so playback sync stays valid."""

import re

from sqlalchemy import select, update
from sqlalchemy.orm import Session, joinedload

from app.models import MeetingParticipant, TranscriptSegment, User
from app.models.mixins import utcnow
from app.schemas.transcript import (
    ReassignRequest,
    ReassignResult,
    ReplaceRequest,
    ReplaceResult,
    SegmentOut,
    SegmentUpdate,
)
from app.services import highlights, meetings
from app.services.errors import NotFoundError, UnprocessableError


def _owned_segment(db: Session, user: User, segment_id: int) -> TranscriptSegment:
    segment = db.get(TranscriptSegment, segment_id, options=[joinedload(TranscriptSegment.speaker)])
    if segment is None:
        raise NotFoundError(f"Segment {segment_id} not found.")
    meetings.get_owned_meeting(db, user, segment.meeting_id)  # ownership check (404 if not the user's)
    return segment


def _require_participant(db: Session, meeting_id: int, person_id: int) -> None:
    if db.get(MeetingParticipant, (meeting_id, person_id)) is None:
        raise UnprocessableError(f"Person {person_id} is not a participant of this meeting.")


def _touch(db: Session, user: User, meeting_id: int) -> None:
    meetings.get_owned_meeting(db, user, meeting_id).updated_at = utcnow()


def update_segment(db: Session, user: User, segment_id: int, data: SegmentUpdate) -> SegmentOut:
    segment = _owned_segment(db, user, segment_id)
    changes = data.model_dump(exclude_unset=True)
    if changes.get("text") is not None:
        segment.text = changes["text"]  # the FTS update trigger re-indexes this row
        highlights.reconcile_segment(db, segment)
    if changes.get("speaker_id") is not None:
        _require_participant(db, segment.meeting_id, changes["speaker_id"])
        segment.speaker_id = changes["speaker_id"]
    _touch(db, user, segment.meeting_id)
    db.commit()
    db.expire_all()
    return SegmentOut.model_validate(_owned_segment(db, user, segment_id))


def replace_text(db: Session, user: User, meeting_id: int, data: ReplaceRequest) -> ReplaceResult:
    meetings.get_owned_meeting(db, user, meeting_id)
    pattern = re.compile(re.escape(data.find), 0 if data.case_sensitive else re.IGNORECASE)
    stmt = select(TranscriptSegment).where(TranscriptSegment.meeting_id == meeting_id)
    if data.segment_ids is not None:
        stmt = stmt.where(TranscriptSegment.id.in_(data.segment_ids))

    replaced = 0
    changed: list[tuple[TranscriptSegment, str]] = []
    for segment in db.scalars(stmt.order_by(TranscriptSegment.sequence_index)):
        new_text, count = pattern.subn(lambda _m: data.replace, segment.text)  # callable: no backslash escapes
        if count:
            if not new_text.strip():
                raise UnprocessableError("That replacement would leave a segment empty; nothing was changed.")
            changed.append((segment, new_text))
            replaced += count
    for segment, new_text in changed:
        segment.text = new_text
        highlights.reconcile_segment(db, segment)
    if changed:
        _touch(db, user, meeting_id)
    db.commit()
    return ReplaceResult(replaced=replaced, segment_ids=[s.id for s, _ in changed])


def reassign_speaker(db: Session, user: User, meeting_id: int, data: ReassignRequest) -> ReassignResult:
    meetings.get_owned_meeting(db, user, meeting_id)
    _require_participant(db, meeting_id, data.from_person_id)
    _require_participant(db, meeting_id, data.to_person_id)
    result = db.execute(
        update(TranscriptSegment)
        .where(TranscriptSegment.meeting_id == meeting_id, TranscriptSegment.speaker_id == data.from_person_id)
        .values(speaker_id=data.to_person_id)
    )
    if result.rowcount:
        _touch(db, user, meeting_id)
    db.commit()
    return ReassignResult(reassigned=result.rowcount)

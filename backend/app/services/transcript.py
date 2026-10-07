from sqlalchemy import select, text
from sqlalchemy.orm import Session, joinedload

from app.models import TranscriptSegment, User
from app.schemas.transcript import SegmentOut, TranscriptOut
from app.services import fts, meetings


def get_transcript(db: Session, user: User, meeting_id: int, q: str | None) -> TranscriptOut:
    meeting = meetings.get_owned_meeting(db, user, meeting_id)
    segments = db.scalars(
        select(TranscriptSegment)
        .where(TranscriptSegment.meeting_id == meeting.id)
        .order_by(TranscriptSegment.sequence_index)
        .options(joinedload(TranscriptSegment.speaker))
    ).all()
    matching: list[int] | None = None
    if q is not None and q.strip():
        match = fts.build_match_query(q)
        matching = []
        if match:
            rows = db.execute(
                text(
                    "SELECT s.id FROM transcript_fts JOIN transcript_segments s ON s.id = transcript_fts.rowid "
                    "WHERE transcript_fts MATCH :match AND s.meeting_id = :mid ORDER BY s.sequence_index"
                ),
                {"match": match, "mid": meeting.id},
            )
            matching = [r[0] for r in rows]
    return TranscriptOut(
        meeting_id=meeting.id,
        segments=[SegmentOut.model_validate(s) for s in segments],
        matching_segment_ids=matching,
    )

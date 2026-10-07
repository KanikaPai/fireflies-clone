"""Generate and persist the summary, chapters and action items for a meeting's transcript."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models import ActionItem, Chapter, Meeting, Summary, TranscriptSegment
from app.services.errors import BadRequestError
from app.services.summarizer import SegmentInput, generate_analysis


def generate_and_store(db: Session, meeting: Meeting) -> None:
    """(Re)generate the summary and chapters. Action items are only generated when the meeting has none,
    so regenerating never overwrites tasks that people have edited, completed or reassigned."""
    segments = list(
        db.scalars(
            select(TranscriptSegment)
            .where(TranscriptSegment.meeting_id == meeting.id)
            .order_by(TranscriptSegment.sequence_index)
            .options(joinedload(TranscriptSegment.speaker))
        )
    )
    if not segments:
        raise BadRequestError("This meeting has no transcript to summarise.")
    analysis = generate_analysis(
        [SegmentInput(i, s.speaker.name, s.start_ms, s.end_ms, s.text) for i, s in enumerate(segments)],
        meeting.meeting_date,
    )

    summary = db.scalar(select(Summary).where(Summary.meeting_id == meeting.id))
    if summary is None:
        summary = Summary(meeting_id=meeting.id)
        db.add(summary)
    summary.overview, summary.keywords, summary.generated_by = analysis.overview, analysis.keywords, analysis.generated_by
    summary.bullets = [{"label": b.label, "text": b.text, "start_ms": b.start_ms} for b in analysis.bullets]

    # Delete before insert: the unit of work runs INSERTs first, which would violate (meeting_id, order_index).
    for chapter in db.scalars(select(Chapter).where(Chapter.meeting_id == meeting.id)):
        db.delete(chapter)
    db.flush()
    for order, draft in enumerate(analysis.chapters):
        db.add(
            Chapter(
                meeting_id=meeting.id,
                title=draft.title,
                summary=draft.summary,
                start_ms=draft.start_ms,
                end_ms=draft.end_ms,
                order_index=order,
                points=[{"text": p.text, "start_ms": p.start_ms} for p in draft.points],
            )
        )

    has_items = db.scalar(select(func.count()).select_from(ActionItem).where(ActionItem.meeting_id == meeting.id))
    if not has_items:
        for draft in analysis.action_items:
            source = segments[draft.segment_index] if draft.segment_index is not None else None
            db.add(
                ActionItem(
                    meeting_id=meeting.id,
                    text=draft.text,
                    assignee_id=source.speaker_id if source else None,
                    source_segment_id=source.id if source else None,
                    due_date=draft.due_date,
                )
            )
    db.flush()

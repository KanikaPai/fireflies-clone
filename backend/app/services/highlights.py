"""Highlights and comments on transcript segments."""

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import HighlightKind, SegmentHighlight, TranscriptSegment, User
from app.schemas.highlight import HighlightAuthor, HighlightCreate, HighlightOut
from app.services import meetings
from app.services.errors import NotFoundError, UnprocessableError


def _to_out(h: SegmentHighlight) -> HighlightOut:
    return HighlightOut(
        id=h.id,
        meeting_id=h.segment.meeting_id,
        segment_id=h.segment_id,
        segment_start_ms=h.segment.start_ms,
        kind=h.kind,
        note=h.note,
        start_char=h.start_char,
        end_char=h.end_char,
        quote=h.quote if h.quote is not None else (h.segment.text if h.kind == HighlightKind.COMMENT else None),
        author=HighlightAuthor(id=h.user.id, name=h.user.name),
        created_at=h.created_at,
    )


def list_highlights(db: Session, user: User, meeting_id: int, kind: HighlightKind | None = None) -> list[HighlightOut]:
    meetings.get_owned_meeting(db, user, meeting_id)
    stmt = (
        select(SegmentHighlight)
        .join(TranscriptSegment, TranscriptSegment.id == SegmentHighlight.segment_id)
        .where(TranscriptSegment.meeting_id == meeting_id, SegmentHighlight.user_id == user.id)
        .options(joinedload(SegmentHighlight.segment), joinedload(SegmentHighlight.user))
        .order_by(TranscriptSegment.start_ms, SegmentHighlight.start_char.is_(None).desc(), SegmentHighlight.start_char, SegmentHighlight.id)
    )
    if kind is not None:
        stmt = stmt.where(SegmentHighlight.kind == kind)
    return [_to_out(h) for h in db.scalars(stmt)]


def create_highlight(db: Session, user: User, meeting_id: int, data: HighlightCreate) -> HighlightOut:
    meetings.get_owned_meeting(db, user, meeting_id)
    segment = db.get(TranscriptSegment, data.segment_id)
    if segment is None or segment.meeting_id != meeting_id:
        raise UnprocessableError(f"Segment {data.segment_id} does not belong to this meeting.")
    quote: str | None = None
    if data.start_char is not None and data.end_char is not None:
        if data.end_char > len(segment.text):
            raise UnprocessableError(
                f"The range {data.start_char}-{data.end_char} is outside the segment text (length {len(segment.text)})."
            )
        quote = segment.text[data.start_char : data.end_char]
        if not quote.strip():
            raise UnprocessableError("The selected range is only whitespace.")
    highlight = SegmentHighlight(
        segment_id=segment.id,
        user_id=user.id,
        kind=data.kind,
        note=data.note or None,
        start_char=data.start_char,
        end_char=data.end_char,
        quote=quote,
    )
    db.add(highlight)
    db.commit()
    db.refresh(highlight)
    return _to_out(highlight)


def delete_highlight(db: Session, user: User, highlight_id: int) -> None:
    highlight = db.get(SegmentHighlight, highlight_id, options=[joinedload(SegmentHighlight.segment)])
    if highlight is None or highlight.user_id != user.id:
        raise NotFoundError(f"Highlight {highlight_id} not found.")
    meetings.get_owned_meeting(db, user, highlight.segment.meeting_id)
    db.delete(highlight)
    db.commit()


def reconcile_segment(db: Session, segment: TranscriptSegment) -> None:
    """Call after a segment's text changed (no commit). A highlight whose range no longer holds its quoted text is
    deleted; a comment is kept but becomes a whole-segment comment (its note is the user's work, not just markup)."""
    for h in db.scalars(select(SegmentHighlight).where(SegmentHighlight.segment_id == segment.id)):
        if h.start_char is None or h.end_char is None:
            continue
        if segment.text[h.start_char : h.end_char] == h.quote and h.end_char <= len(segment.text):
            continue
        if h.kind == HighlightKind.COMMENT:
            h.start_char = h.end_char = None
        else:
            db.delete(h)

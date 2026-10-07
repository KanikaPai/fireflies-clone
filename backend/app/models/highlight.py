from __future__ import annotations

import enum
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.meeting import enum_column
from app.models.mixins import CreatedAtMixin

if TYPE_CHECKING:
    from app.models.transcript import TranscriptSegment
    from app.models.user import User


class HighlightKind(str, enum.Enum):
    HIGHLIGHT = "highlight"
    COMMENT = "comment"


class SegmentHighlight(CreatedAtMixin, Base):
    """A user's highlight or comment on a transcript segment, optionally on a character range of its text.

    ``start_char``/``end_char`` are offsets into the segment text (end exclusive); both are NULL for a note on the
    whole segment. ``quote`` keeps the highlighted text so a later edit of the segment can be detected: a range
    whose text no longer matches its quote is dropped (a comment is kept as a whole-segment comment instead).
    """

    __tablename__ = "segment_highlights"
    __table_args__ = (
        Index("ix_highlights_segment", "segment_id"),
        Index("ix_highlights_user", "user_id"),
        CheckConstraint(
            "(start_char IS NULL AND end_char IS NULL) OR (start_char IS NOT NULL AND end_char IS NOT NULL "
            "AND start_char >= 0 AND end_char > start_char)",
            name="ck_highlights_range",
        ),
        CheckConstraint("kind != 'comment' OR (note IS NOT NULL AND length(note) > 0)", name="ck_highlights_comment_note"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    segment_id: Mapped[int] = mapped_column(ForeignKey("transcript_segments.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    kind: Mapped[HighlightKind] = mapped_column(enum_column(HighlightKind, "highlight_kind"), default=HighlightKind.HIGHLIGHT)
    note: Mapped[str | None] = mapped_column(Text)
    start_char: Mapped[int | None]
    end_char: Mapped[int | None]
    quote: Mapped[str | None] = mapped_column(Text)

    segment: Mapped[TranscriptSegment] = relationship(back_populates="highlights")
    user: Mapped[User] = relationship(back_populates="highlights")

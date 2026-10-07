from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.mixins import CreatedAtMixin

if TYPE_CHECKING:
    from app.models.transcript import TranscriptSegment
    from app.models.user import User


class SegmentHighlight(CreatedAtMixin, Base):
    """A user's highlight / comment on a transcript segment."""

    __tablename__ = "segment_highlights"
    __table_args__ = (Index("ix_highlights_segment", "segment_id"), Index("ix_highlights_user", "user_id"))

    id: Mapped[int] = mapped_column(primary_key=True)
    segment_id: Mapped[int] = mapped_column(ForeignKey("transcript_segments.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    note: Mapped[str | None] = mapped_column(Text)

    segment: Mapped[TranscriptSegment] = relationship(back_populates="highlights")
    user: Mapped[User] = relationship(back_populates="highlights")

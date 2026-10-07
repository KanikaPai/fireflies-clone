from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.meeting import Meeting
    from app.models.person import Person
    from app.models.transcript import TranscriptSegment


class ActionItem(TimestampMixin, Base):
    __tablename__ = "action_items"
    __table_args__ = (
        Index("ix_action_items_meeting_completed", "meeting_id", "is_completed"),
        Index("ix_action_items_assignee", "assignee_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    text: Mapped[str] = mapped_column(Text)
    # SET NULL on both: deleting a person or a segment must not delete the task itself.
    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("people.id", ondelete="SET NULL"))
    source_segment_id: Mapped[int | None] = mapped_column(
        ForeignKey("transcript_segments.id", ondelete="SET NULL")
    )
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    due_date: Mapped[date | None] = mapped_column(Date)

    meeting: Mapped[Meeting] = relationship(back_populates="action_items")
    assignee: Mapped[Person | None] = relationship()
    source_segment: Mapped[TranscriptSegment | None] = relationship()

    @property
    def source_start_ms(self) -> int | None:
        """Start time of the segment this item was said in (None if unlinked)."""
        return self.source_segment.start_ms if self.source_segment is not None else None

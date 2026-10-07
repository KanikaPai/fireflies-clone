from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Index, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.highlight import SegmentHighlight
    from app.models.meeting import Meeting
    from app.models.person import Person


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"
    __table_args__ = (
        CheckConstraint("start_ms >= 0 AND end_ms >= start_ms", name="ck_segments_time_order"),
        UniqueConstraint("meeting_id", "sequence_index", name="uq_segments_meeting_sequence"),
        # Serves "which segment is playing at time t" lookups and ordered transcript reads.
        Index("ix_segments_meeting_start", "meeting_id", "start_ms"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    # RESTRICT: a person who spoke in a transcript cannot be deleted out from under it.
    speaker_id: Mapped[int] = mapped_column(
        ForeignKey("people.id", ondelete="RESTRICT"), index=True
    )
    start_ms: Mapped[int]
    end_ms: Mapped[int]
    text: Mapped[str] = mapped_column(Text)
    sequence_index: Mapped[int]

    meeting: Mapped[Meeting] = relationship(back_populates="segments")
    speaker: Mapped[Person] = relationship()
    highlights: Mapped[list[SegmentHighlight]] = relationship(
        back_populates="segment", cascade="all, delete-orphan", passive_deletes=True
    )

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.meeting import Meeting


class Chapter(Base):
    """A topic / outline entry covering a time range of the recording."""

    __tablename__ = "chapters"
    __table_args__ = (
        CheckConstraint("start_ms >= 0 AND end_ms >= start_ms", name="ck_chapters_time_order"),
        UniqueConstraint("meeting_id", "order_index", name="uq_chapters_meeting_order"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255))
    start_ms: Mapped[int]
    end_ms: Mapped[int]
    summary: Mapped[str | None] = mapped_column(Text)
    order_index: Mapped[int]

    meeting: Mapped[Meeting] = relationship(back_populates="chapters")

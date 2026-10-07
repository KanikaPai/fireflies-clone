from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.mixins import CreatedAtMixin

if TYPE_CHECKING:
    from app.models.meeting import Meeting


class MeetingShare(CreatedAtMixin, Base):
    """An email the meeting was shared with. Recorded only; no email is sent (auth is mocked)."""

    __tablename__ = "meeting_shares"
    __table_args__ = (UniqueConstraint("meeting_id", "email", name="uq_meeting_shares_meeting_email"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    email: Mapped[str] = mapped_column(String(255))  # stored lower-cased

    meeting: Mapped[Meeting] = relationship(back_populates="shares")

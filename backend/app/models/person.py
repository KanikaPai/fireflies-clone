from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.meeting import MeetingParticipant


class Person(Base):
    """A meeting participant / speaker, reused across meetings."""

    __tablename__ = "people"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str | None] = mapped_column(String(255), unique=True)
    avatar_color: Mapped[str] = mapped_column(String(7), default="#6366f1")

    participations: Mapped[list[MeetingParticipant]] = relationship(
        back_populates="person", cascade="all, delete-orphan", passive_deletes=True
    )

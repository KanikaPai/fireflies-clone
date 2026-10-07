from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.mixins import CreatedAtMixin

if TYPE_CHECKING:
    from app.models.highlight import SegmentHighlight
    from app.models.meeting import Meeting
    from app.models.user_settings import UserSettings


class User(CreatedAtMixin, Base):
    """An application account. Auth is mocked, so a single default user is seeded."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500))

    meetings: Mapped[list[Meeting]] = relationship(
        back_populates="owner", cascade="all, delete-orphan", passive_deletes=True
    )
    highlights: Mapped[list[SegmentHighlight]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    settings: Mapped[UserSettings | None] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True, uselist=False
    )

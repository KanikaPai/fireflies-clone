from __future__ import annotations

import enum
from typing import TYPE_CHECKING

from sqlalchemy import JSON, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.meeting import _enum
from app.models.mixins import CreatedAtMixin

if TYPE_CHECKING:
    from app.models.meeting import Meeting


class GeneratedBy(str, enum.Enum):
    SEED = "seed"
    LLM = "llm"


class Summary(CreatedAtMixin, Base):
    """One-to-one with a meeting (enforced by the unique FK)."""

    __tablename__ = "summaries"

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), unique=True
    )
    overview: Mapped[str] = mapped_column(Text)
    keywords: Mapped[list[str]] = mapped_column(JSON, default=list)
    generated_by: Mapped[GeneratedBy] = mapped_column(
        _enum(GeneratedBy, "generated_by"), default=GeneratedBy.SEED
    )

    meeting: Mapped[Meeting] = relationship(back_populates="summary")

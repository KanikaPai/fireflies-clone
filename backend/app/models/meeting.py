from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.action_item import ActionItem
    from app.models.chapter import Chapter
    from app.models.person import Person
    from app.models.summary import Summary
    from app.models.tag import Tag
    from app.models.transcript import TranscriptSegment
    from app.models.user import User


class Platform(str, enum.Enum):
    ZOOM = "zoom"
    GOOGLE_MEET = "google_meet"
    TEAMS = "teams"
    UPLOAD = "upload"


class MeetingStatus(str, enum.Enum):
    PROCESSING = "processing"
    READY = "ready"


class ParticipantRole(str, enum.Enum):
    HOST = "host"
    ATTENDEE = "attendee"


def _enum(cls: type[enum.Enum], name: str) -> Enum:
    # Stored as VARCHAR (no native enum) using the lowercase values; portable and CHECK-constrained.
    return Enum(cls, name=name, native_enum=False, values_callable=lambda e: [m.value for m in e])


class Meeting(TimestampMixin, Base):
    __tablename__ = "meetings"
    __table_args__ = (
        CheckConstraint("duration_seconds >= 0", name="ck_meetings_duration_nonneg"),
        Index("ix_meetings_owner_date", "owner_id", "meeting_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255))
    meeting_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[int] = mapped_column(default=0)
    platform: Mapped[Platform] = mapped_column(_enum(Platform, "platform"))
    media_url: Mapped[str | None] = mapped_column(String(1000))
    status: Mapped[MeetingStatus] = mapped_column(
        _enum(MeetingStatus, "meeting_status"), default=MeetingStatus.PROCESSING, index=True
    )

    owner: Mapped[User] = relationship(back_populates="meetings")
    participants: Mapped[list[MeetingParticipant]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", passive_deletes=True
    )
    segments: Mapped[list[TranscriptSegment]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="TranscriptSegment.sequence_index",
    )
    summary: Mapped[Summary | None] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", passive_deletes=True, uselist=False
    )
    chapters: Mapped[list[Chapter]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="Chapter.order_index",
    )
    action_items: Mapped[list[ActionItem]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", passive_deletes=True
    )
    tags: Mapped[list[Tag]] = relationship(secondary="meeting_tags", back_populates="meetings")


class MeetingParticipant(Base):
    """Association between a meeting and a person, carrying the person's role."""

    __tablename__ = "meeting_participants"

    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True
    )
    person_id: Mapped[int] = mapped_column(
        ForeignKey("people.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    role: Mapped[ParticipantRole] = mapped_column(
        _enum(ParticipantRole, "participant_role"), default=ParticipantRole.ATTENDEE
    )

    meeting: Mapped[Meeting] = relationship(back_populates="participants")
    person: Mapped[Person] = relationship(back_populates="participations")

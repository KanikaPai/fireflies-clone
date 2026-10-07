from __future__ import annotations

import enum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.meeting import Privacy, enum_column
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class AutoJoin(str, enum.Enum):
    ALL = "all"  # all meetings with a web-conference link
    OWNED = "owned"  # only meetings I own
    TEAMMATES = "teammates"  # only meetings with teammates
    INVITED = "invited"  # only when I invite the notetaker


class RecapRecipients(str, enum.Enum):
    EVERYONE = "everyone"  # everyone on the invite
    TEAM = "team"  # me and participants from my team
    ME = "me"


class Theme(str, enum.Enum):
    LIGHT = "light"
    DARK = "dark"
    SYSTEM = "system"


DEFAULT_LANGUAGE = "English (Global)"


class UserSettings(TimestampMixin, Base):
    """Per-user preferences (one row per user, created with defaults)."""

    __tablename__ = "user_settings"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    default_privacy: Mapped[Privacy] = mapped_column(enum_column(Privacy, "settings_privacy"), default=Privacy.LINK)
    auto_join: Mapped[AutoJoin] = mapped_column(enum_column(AutoJoin, "auto_join"), default=AutoJoin.ALL)
    recap_recipients: Mapped[RecapRecipients] = mapped_column(
        enum_column(RecapRecipients, "recap_recipients"), default=RecapRecipients.EVERYONE
    )
    language: Mapped[str] = mapped_column(String(60), default=DEFAULT_LANGUAGE)
    email_notes_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_on_ready: Mapped[bool] = mapped_column(Boolean, default=True)
    theme: Mapped[Theme] = mapped_column(enum_column(Theme, "theme"), default=Theme.SYSTEM)

    user: Mapped[User] = relationship(back_populates="settings")

from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict

from app.models import AutoJoin, Privacy, RecapRecipients, Theme
from app.schemas.common import Name
from app.schemas.person import Email

LANGUAGES = [
    "English (Global)",
    "English (US)",
    "English (UK)",
    "Spanish",
    "French",
    "German",
    "Portuguese",
    "Hindi",
    "Japanese",
]


def _known_language(value: str) -> str:
    if value not in LANGUAGES:
        raise ValueError(f"Unsupported language. Choose one of: {', '.join(LANGUAGES)}")
    return value


Language = Annotated[str, AfterValidator(_known_language)]


class UserSettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    default_privacy: Privacy
    auto_join: AutoJoin
    recap_recipients: RecapRecipients
    language: str
    email_notes_enabled: bool
    notify_on_ready: bool
    theme: Theme


class UserSettingsUpdate(BaseModel):
    """Partial update: only the fields present are changed. null is not a valid value for any field."""

    model_config = ConfigDict(extra="forbid")

    default_privacy: Privacy | None = None
    auto_join: AutoJoin | None = None
    recap_recipients: RecapRecipients | None = None
    language: Language | None = None
    email_notes_enabled: bool | None = None
    notify_on_ready: bool | None = None
    theme: Theme | None = None


class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Name | None = None
    email: Email | None = None

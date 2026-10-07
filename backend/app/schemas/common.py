from datetime import datetime, timezone
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, StringConstraints

HexColor = Annotated[str, StringConstraints(pattern=r"^#[0-9a-fA-F]{6}$")]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]


def _to_utc(value: datetime) -> datetime:
    """Treat naive datetimes as UTC and normalise aware ones to UTC."""
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


UtcDatetime = Annotated[datetime, AfterValidator(_to_utc)]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

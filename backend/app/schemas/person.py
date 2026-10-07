from typing import Annotated

from pydantic import BaseModel, StringConstraints

from app.schemas.common import HexColor, Name, ORMModel, UtcDatetime

Email = Annotated[str, StringConstraints(strip_whitespace=True, max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")]


class PersonBrief(ORMModel):
    id: int
    name: str
    avatar_color: str


class PersonOut(PersonBrief):
    email: str | None


class PersonCreate(BaseModel):
    name: Name
    email: Email | None = None
    avatar_color: HexColor | None = None


class PersonWithStats(PersonOut):
    meeting_count: int
    last_meeting_date: UtcDatetime | None

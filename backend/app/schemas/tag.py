from typing import Annotated

from pydantic import BaseModel, StringConstraints

from app.schemas.common import HexColor, ORMModel

TagName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]


class TagOut(ORMModel):
    id: int
    name: str
    color: str


class TagCreate(BaseModel):
    name: TagName
    color: HexColor | None = None

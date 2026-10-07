from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints, model_validator

from app.models import HighlightKind
from app.schemas.common import ORMModel, UtcDatetime

Note = Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)]


class HighlightAuthor(ORMModel):
    id: int
    name: str


class HighlightOut(ORMModel):
    id: int
    meeting_id: int
    segment_id: int
    segment_start_ms: int  # where to seek; also the sort key
    kind: HighlightKind
    note: str | None
    start_char: int | None
    end_char: int | None
    quote: str | None  # the highlighted text (the whole segment text for a comment without a range)
    author: HighlightAuthor
    created_at: UtcDatetime


class HighlightCreate(BaseModel):
    segment_id: int
    kind: HighlightKind = HighlightKind.HIGHLIGHT
    start_char: int | None = Field(default=None, ge=0)
    end_char: int | None = Field(default=None, ge=1)
    note: Note | None = None

    @model_validator(mode="after")
    def _check(self) -> "HighlightCreate":
        if (self.start_char is None) != (self.end_char is None):
            raise ValueError("start_char and end_char must be given together")
        if self.start_char is not None and self.end_char is not None and self.end_char <= self.start_char:
            raise ValueError("end_char must be greater than start_char")
        if self.kind == HighlightKind.COMMENT and not self.note:
            raise ValueError("A comment needs a note")
        if self.kind == HighlightKind.HIGHLIGHT and self.start_char is None:
            raise ValueError("A highlight needs start_char and end_char")
        return self

from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints

from app.schemas.person import PersonBrief

MAX_QUESTION_CHARS = 1000
MAX_HISTORY = 20

Question = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=MAX_QUESTION_CHARS)]


class AskMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: Annotated[str, StringConstraints(max_length=8000)]


class AskRequest(BaseModel):
    question: Question
    history: list[AskMessage] = Field(default_factory=list, max_length=MAX_HISTORY, description="Earlier turns, oldest first")


class Citation(BaseModel):
    segment_id: int
    start_ms: int
    speaker: PersonBrief


class AskResponse(BaseModel):
    answer_markdown: str
    citations: list[Citation]
    source: Literal["llm", "heuristic"]


from pydantic import BaseModel

from app.models import GeneratedBy
from app.schemas.common import ORMModel, UtcDatetime


class SummaryBullet(BaseModel):
    label: str
    text: str
    start_ms: int


class ChapterPoint(BaseModel):
    text: str
    start_ms: int


class SummaryOut(ORMModel):
    overview: str
    keywords: list[str]
    bullets: list[SummaryBullet]
    generated_by: GeneratedBy
    created_at: UtcDatetime


class ChapterOut(ORMModel):
    id: int
    title: str
    start_ms: int
    end_ms: int
    summary: str | None
    order_index: int
    points: list[ChapterPoint]

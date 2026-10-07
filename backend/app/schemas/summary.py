from datetime import datetime

from app.models import GeneratedBy
from app.schemas.common import ORMModel


class SummaryOut(ORMModel):
    overview: str
    keywords: list[str]
    generated_by: GeneratedBy
    created_at: datetime


class ChapterOut(ORMModel):
    id: int
    title: str
    start_ms: int
    end_ms: int
    summary: str | None
    order_index: int

from pydantic import BaseModel

from app.schemas.common import ORMModel, UtcDatetime
from app.schemas.person import Email


class ShareCreate(BaseModel):
    email: Email


class ShareOut(ORMModel):
    id: int
    email: str
    created_at: UtcDatetime

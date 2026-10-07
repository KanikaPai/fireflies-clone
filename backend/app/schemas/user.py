from datetime import datetime

from app.schemas.common import ORMModel


class UserOut(ORMModel):
    id: int
    name: str
    email: str
    avatar_url: str | None
    created_at: datetime

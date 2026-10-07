
from app.schemas.common import ORMModel, UtcDatetime


class UserOut(ORMModel):
    id: int
    name: str
    email: str
    avatar_url: str | None
    created_at: UtcDatetime

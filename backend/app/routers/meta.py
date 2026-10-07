from fastapi import APIRouter
from pydantic import BaseModel

from app.deps import CurrentUser
from app.schemas.user import UserOut

router = APIRouter(prefix="/api", tags=["meta"])


class HealthOut(BaseModel):
    status: str


@router.get("/health", response_model=HealthOut, summary="Health check")
def health() -> HealthOut:
    return HealthOut(status="ok")


@router.get("/me", response_model=UserOut, summary="Current user (mocked auth)")
def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)

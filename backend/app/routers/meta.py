from fastapi import APIRouter
from pydantic import BaseModel

from app.deps import CurrentUser, DbSession
from app.schemas.settings import UserSettingsOut, UserSettingsUpdate, UserUpdate
from app.schemas.user import UserOut
from app.services import settings as settings_service

router = APIRouter(prefix="/api", tags=["meta"])


class HealthOut(BaseModel):
    status: str


@router.get("/health", response_model=HealthOut, summary="Health check")
def health() -> HealthOut:
    return HealthOut(status="ok")


@router.get("/me", response_model=UserOut, summary="Current user (mocked auth)")
def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)


@router.patch("/me", response_model=UserOut, summary="Update the current user's name or email")
def update_me(data: UserUpdate, db: DbSession, user: CurrentUser) -> UserOut:
    return UserOut.model_validate(settings_service.update_user(db, user, data))


@router.get("/me/settings", response_model=UserSettingsOut, summary="Current user's settings")
def get_my_settings(db: DbSession, user: CurrentUser) -> UserSettingsOut:
    return UserSettingsOut.model_validate(settings_service.get_settings(db, user))


@router.patch(
    "/me/settings",
    response_model=UserSettingsOut,
    summary="Update settings",
    description="Partial update. Unknown fields and null values are rejected.",
)
def update_my_settings(data: UserSettingsUpdate, db: DbSession, user: CurrentUser) -> UserSettingsOut:
    return UserSettingsOut.model_validate(settings_service.update_settings(db, user, data))

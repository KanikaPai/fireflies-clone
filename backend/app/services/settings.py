from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import User, UserSettings
from app.models.mixins import utcnow
from app.schemas.settings import UserSettingsUpdate, UserUpdate
from app.services.errors import BadRequestError, ConflictError


def get_settings(db: Session, user: User) -> UserSettings:
    """The user's settings row, created with defaults on first access (the seed also creates it)."""
    settings = db.get(UserSettings, user.id)
    if settings is None:
        settings = UserSettings(user_id=user.id)
        db.add(settings)
        db.commit()
    return settings


def update_settings(db: Session, user: User, data: UserSettingsUpdate) -> UserSettings:
    settings = get_settings(db, user)
    changes = data.model_dump(exclude_unset=True)
    if any(value is None for value in changes.values()):
        raise BadRequestError("Settings cannot be set to null.")
    for field, value in changes.items():
        setattr(settings, field, value)
    settings.updated_at = utcnow()
    db.commit()
    return settings


def update_user(db: Session, user: User, data: UserUpdate) -> User:
    changes = data.model_dump(exclude_unset=True)
    if any(value is None for value in changes.values()):
        raise BadRequestError("Name and email cannot be empty.")
    if "email" in changes:
        clash = db.scalar(select(User.id).where(func.lower(User.email) == changes["email"].lower(), User.id != user.id))
        if clash:
            raise ConflictError(f"Another account already uses {changes['email']}.")
    for field, value in changes.items():
        setattr(user, field, value)
    db.commit()
    return user

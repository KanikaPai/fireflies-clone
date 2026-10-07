"""Shared FastAPI dependencies."""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(db: DbSession) -> User:
    """Mocked auth: the single default user. Replace this dependency to add real authentication."""
    user = db.scalar(select(User).order_by(User.id).limit(1))
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No user available")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]

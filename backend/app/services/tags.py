from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Tag
from app.schemas.tag import TagCreate
from app.services.errors import BadRequestError, ConflictError

_COLORS = ["#0ea5e9", "#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#ef4444", "#14b8a6"]


def list_tags(db: Session) -> list[Tag]:
    return list(db.scalars(select(Tag).order_by(func.lower(Tag.name))))


def create_tag(db: Session, data: TagCreate) -> Tag:
    if db.scalar(select(Tag.id).where(func.lower(Tag.name) == data.name.lower())):
        raise ConflictError(f"A tag named '{data.name}' already exists.")
    color = data.color or _COLORS[sum(map(ord, data.name.lower())) % len(_COLORS)]
    tag = Tag(name=data.name, color=color)
    db.add(tag)
    db.commit()
    return tag


def get_many(db: Session, ids: list[int]) -> list[Tag]:
    unique = list(dict.fromkeys(ids))
    tags = list(db.scalars(select(Tag).where(Tag.id.in_(unique)))) if unique else []
    missing = set(unique) - {t.id for t in tags}
    if missing:
        raise BadRequestError(f"Unknown tag id(s): {sorted(missing)}")
    return tags

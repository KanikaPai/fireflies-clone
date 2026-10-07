from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Meeting, MeetingParticipant, Person, User
from app.schemas.person import PersonCreate, PersonWithStats
from app.services.errors import ConflictError

_PALETTE = [
    "#6366f1", "#ec4899", "#0ea5e9", "#f59e0b", "#10b981", "#8b5cf6",
    "#ef4444", "#14b8a6", "#f97316", "#06b6d4", "#84cc16", "#d946ef",
]  # fmt: skip


def _color_for(name: str) -> str:
    return _PALETTE[sum(map(ord, name.lower())) % len(_PALETTE)]


def list_people(db: Session, user: User, q: str | None = None) -> list[PersonWithStats]:
    """People with how many of the user's meetings they attended and when they last met."""
    stmt = (
        select(Person, func.count(Meeting.id), func.max(Meeting.meeting_date))
        .outerjoin(MeetingParticipant, MeetingParticipant.person_id == Person.id)
        .outerjoin(Meeting, (Meeting.id == MeetingParticipant.meeting_id) & (Meeting.owner_id == user.id))
        .group_by(Person.id)
        .order_by(func.lower(Person.name), Person.id)
    )
    if q and q.strip():
        stmt = stmt.where(Person.name.ilike(f"%{q.strip()}%"))
    return [
        PersonWithStats(
            id=p.id, name=p.name, email=p.email, avatar_color=p.avatar_color,
            meeting_count=count, last_meeting_date=last,
        )
        for p, count, last in db.execute(stmt)
    ]  # fmt: skip


def create_person(db: Session, data: PersonCreate) -> Person:
    if data.email and db.scalar(select(Person.id).where(func.lower(Person.email) == data.email.lower())):
        raise ConflictError(f"A person with email '{data.email}' already exists.")
    person = Person(name=data.name, email=data.email, avatar_color=data.avatar_color or _color_for(data.name))
    db.add(person)
    db.commit()
    return person


def get_or_create_many(db: Session, names: list[str]) -> dict[str, Person]:
    """Resolve names to people (case-insensitive), creating missing ones. Keys are lower-cased names."""
    wanted = {n.strip().lower(): n.strip() for n in reversed(names) if n.strip()}
    if not wanted:
        return {}
    existing = {
        p.name.lower(): p for p in db.scalars(select(Person).where(func.lower(Person.name).in_(list(wanted))))
    }
    for key, name in wanted.items():
        if key not in existing:
            existing[key] = Person(name=name, avatar_color=_color_for(name))
            db.add(existing[key])
    db.flush()
    return {k: existing[k] for k in wanted}

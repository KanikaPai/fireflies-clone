from typing import Annotated

from fastapi import APIRouter, Query, status

from app.deps import CurrentUser, DbSession
from app.schemas.person import PersonCreate, PersonOut, PersonWithStats
from app.services import people

router = APIRouter(prefix="/api/people", tags=["people"])


@router.get("", response_model=list[PersonWithStats], summary="List people with meeting stats")
def list_people(
    db: DbSession, user: CurrentUser, q: Annotated[str | None, Query(description="Filter by name")] = None
) -> list[PersonWithStats]:
    return people.list_people(db, user, q)


@router.post("", response_model=PersonOut, status_code=status.HTTP_201_CREATED, summary="Create a person")
def create_person(data: PersonCreate, db: DbSession) -> PersonOut:
    return PersonOut.model_validate(people.create_person(db, data))

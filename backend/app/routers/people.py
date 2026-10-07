from typing import Annotated

from fastapi import APIRouter, Query, status

from app.deps import DbSession
from app.schemas.person import PersonCreate, PersonOut
from app.services import people

router = APIRouter(prefix="/api/people", tags=["people"])


@router.get("", response_model=list[PersonOut], summary="List people")
def list_people(db: DbSession, q: Annotated[str | None, Query(description="Filter by name")] = None) -> list[PersonOut]:
    return [PersonOut.model_validate(p) for p in people.list_people(db, q)]


@router.post("", response_model=PersonOut, status_code=status.HTTP_201_CREATED, summary="Create a person")
def create_person(data: PersonCreate, db: DbSession) -> PersonOut:
    return PersonOut.model_validate(people.create_person(db, data))

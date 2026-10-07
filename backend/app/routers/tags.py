from fastapi import APIRouter, status

from app.deps import DbSession
from app.schemas.tag import TagCreate, TagOut
from app.services import tags

router = APIRouter(prefix="/api/tags", tags=["tags"])


@router.get("", response_model=list[TagOut], summary="List tags")
def list_tags(db: DbSession) -> list[TagOut]:
    return [TagOut.model_validate(t) for t in tags.list_tags(db)]


@router.post("", response_model=TagOut, status_code=status.HTTP_201_CREATED, summary="Create a tag")
def create_tag(data: TagCreate, db: DbSession) -> TagOut:
    return TagOut.model_validate(tags.create_tag(db, data))

from typing import Annotated

from fastapi import APIRouter, Query, Response, status

from app.deps import CurrentUser, DbSession
from app.models import HighlightKind
from app.schemas.highlight import HighlightCreate, HighlightOut
from app.services import highlights

router = APIRouter(prefix="/api", tags=["highlights"])


@router.get("/meetings/{meeting_id}/highlights", response_model=list[HighlightOut], summary="List highlights and comments")
def list_highlights(
    meeting_id: int,
    db: DbSession,
    user: CurrentUser,
    kind: Annotated[HighlightKind | None, Query(description="Only highlights or only comments")] = None,
) -> list[HighlightOut]:
    return highlights.list_highlights(db, user, meeting_id, kind)


@router.post(
    "/meetings/{meeting_id}/highlights",
    response_model=HighlightOut,
    status_code=status.HTTP_201_CREATED,
    summary="Highlight text or comment on a transcript segment",
)
def create_highlight(meeting_id: int, data: HighlightCreate, db: DbSession, user: CurrentUser) -> HighlightOut:
    return highlights.create_highlight(db, user, meeting_id, data)


@router.delete("/highlights/{highlight_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a highlight or comment")
def delete_highlight(highlight_id: int, db: DbSession, user: CurrentUser) -> Response:
    highlights.delete_highlight(db, user, highlight_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

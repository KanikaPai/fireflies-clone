from fastapi import APIRouter, Response, status

from app.deps import CurrentUser, DbSession
from app.schemas.share import ShareCreate, ShareOut
from app.services import shares

router = APIRouter(prefix="/api/meetings/{meeting_id}/shares", tags=["sharing"])


@router.get("", response_model=list[ShareOut], summary="List the emails a meeting is shared with")
def list_shares(meeting_id: int, db: DbSession, user: CurrentUser) -> list[ShareOut]:
    return shares.list_shares(db, user, meeting_id)


@router.post(
    "",
    response_model=ShareOut,
    status_code=status.HTTP_201_CREATED,
    summary="Share a meeting with an email",
    description="Recorded only: no email is sent (auth is mocked). 409 if already shared with that email.",
)
def create_share(meeting_id: int, data: ShareCreate, db: DbSession, user: CurrentUser) -> ShareOut:
    return shares.create_share(db, user, meeting_id, data)


@router.delete("/{share_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Stop sharing with an email")
def delete_share(meeting_id: int, share_id: int, db: DbSession, user: CurrentUser) -> Response:
    shares.delete_share(db, user, meeting_id, share_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

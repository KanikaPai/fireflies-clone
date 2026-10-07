from fastapi import APIRouter

from app.deps import CurrentUser, DbSession
from app.schemas.askfred import AskRequest, AskResponse
from app.services import askfred

router = APIRouter(prefix="/api/meetings", tags=["askfred"])


@router.post(
    "/{meeting_id}/ask",
    response_model=AskResponse,
    summary="Ask a question about a meeting",
    description="Answers only from this meeting. Uses Claude when `ANTHROPIC_API_KEY` is set (falling back on any "
    "error), otherwise a deterministic built-in engine. `citations` are transcript segments of this meeting.",
)
def ask(meeting_id: int, data: AskRequest, db: DbSession, user: CurrentUser) -> AskResponse:
    return askfred.ask(db, user, meeting_id, data)

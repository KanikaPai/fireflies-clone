from typing import Annotated

from fastapi import APIRouter, Query

from app.deps import CurrentUser, DbSession
from app.schemas.search import SearchResponse
from app.services import search

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get(
    "",
    response_model=SearchResponse,
    summary="Search all transcripts and meeting titles",
    description="Full-text search (SQLite FTS5) over every transcript, plus meeting titles. Input is "
    "sanitised, so punctuation and FTS operators are treated as plain text. Snippets are HTML-safe "
    "with matches wrapped in `<mark>`. Also returns matching action items and summary-note bullets "
    "(category-tagged, capped per category).",
)
def global_search(
    db: DbSession,
    user: CurrentUser,
    q: Annotated[str, Query(min_length=1, max_length=200)],
    limit: Annotated[int, Query(ge=1, le=50, description="Max meetings returned")] = 20,
    matches_per_meeting: Annotated[int, Query(ge=1, le=10)] = 3,
    per_category: Annotated[int, Query(ge=1, le=50, description="Max action items and summary bullets returned")] = 10,
) -> SearchResponse:
    return search.search(db, user, q, limit=limit, matches_per_meeting=matches_per_meeting, per_category=per_category)

"""AskFred: answer a question about one meeting, using only that meeting's content.

With ``ANTHROPIC_API_KEY`` set, Claude answers from the summary + transcript and cites segment ids as ``[#id]``
(ids that do not exist in this meeting are dropped). On any error, or with no key, a deterministic heuristic engine
answers from the database: action items, summary points, a follow-up email template, a speaker's lines, or a keyword
search over the transcript. The heuristic engine only quotes or lists what is in the meeting; it never invents text.

Modules: ``intents`` (question classification), ``heuristic`` (built-in engine), ``llm`` (Claude path + citations).
"""

import logging
import os

from sqlalchemy.orm import Session

from app.models import User
from app.schemas.askfred import AskRequest, AskResponse
from app.services import meetings, transcript

from .common import Meeting
from .heuristic import answer_heuristically
from .llm import ask_llm

logger = logging.getLogger(__name__)

__all__ = ["ask"]


def ask(db: Session, user: User, meeting_id: int, data: AskRequest) -> AskResponse:
    detail = meetings.get_meeting_detail(db, user, meeting_id)
    segments = transcript.get_transcript(db, user, meeting_id, None).segments
    ctx = Meeting(detail, segments, user.name)
    if os.getenv("ANTHROPIC_API_KEY", "").strip():
        try:
            return ask_llm(ctx, data)
        except Exception:  # timeout, network, API error, empty answer: never fail the chat because of the model
            logger.warning("AskFred model call failed; using the built-in answer engine", exc_info=True)
    return answer_heuristically(ctx, data.question)

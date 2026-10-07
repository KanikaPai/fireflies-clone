"""Intent detection for the built-in answer engine: which kind of question is this?"""

import re
from enum import Enum

from app.schemas.person import PersonBrief

from .common import Meeting, first_names, words

_EMAIL = re.compile(r"\b(e-?mail|follow[- ]?ups?|recap)\b", re.I)
_ACTIONS = re.compile(r"\b(action items?|actions|tasks?|to[- ]?dos?|next steps?|assigned|owners?|deliverables?)\b", re.I)
_SUMMARY = re.compile(r"\b(summar\w*|key (points?|takeaways?|decisions?)|decisions?|decided|takeaways?|highlights?|overview|tl;?dr)\b", re.I)
_SPEAKER_CUE = re.compile(r"\b(say|said|says|mention\w*|points?|think|thought|talk\w*|discuss\w*|share\w*|rais\w*|comment\w*|view|opinion|suggest\w*)\b", re.I)


class Intent(Enum):
    EMAIL = "email"
    ACTIONS = "actions"
    SUMMARY = "summary"
    SPEAKER = "speaker"
    KEYWORD = "keyword"


def speaker_in(question: str, ctx: Meeting) -> PersonBrief | None:
    q_words = set(words(question)) | {w.removesuffix("'s") for w in words(question)}
    speakers = {s.speaker.id: s.speaker for s in ctx.segments}
    for person in speakers.values():
        if q_words & first_names(person.name):
            return person
    return None


def detect_intent(question: str, ctx: Meeting) -> tuple[Intent, PersonBrief | None]:
    """Pick an intent by keyword (email, action items, summary, a named speaker); anything else is a keyword search."""
    if _EMAIL.search(question):
        return Intent.EMAIL, None
    if _ACTIONS.search(question):
        return Intent.ACTIONS, None
    if _SUMMARY.search(question):
        return Intent.SUMMARY, None
    speaker = speaker_in(question, ctx)
    if speaker is not None and _SPEAKER_CUE.search(question):
        return Intent.SPEAKER, speaker
    return Intent.KEYWORD, None

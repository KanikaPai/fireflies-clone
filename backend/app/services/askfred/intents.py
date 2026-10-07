"""Intent detection for the built-in answer engine: which kind of question is this?"""

import re
from enum import Enum

from app.schemas.person import PersonBrief

from .common import Meeting, first_names, words
from .terms import content_words

_EMAIL = re.compile(r"\b(e-?mail|follow[- ]?ups?|recap)\b", re.I)
_ACTIONS = re.compile(
    r"\b(action items?|actions|tasks?|to[- ]?dos?|next steps?|assigned|owners?|deliverables?"
    r"|what happens next|what(?:'s| is| comes) next)\b",
    re.I,
)
_SUMMARY = re.compile(r"\b(summar\w*|key (points?|takeaways?|decisions?)|decisions?|decided|takeaways?|highlights?|overview|tl;?dr)\b", re.I)
_SPEAKER_CUE = re.compile(r"\b(say|said|says|mention\w*|points?|think|thought|talk\w*|discuss\w*|share\w*|rais\w*|comment\w*|view|opinion|suggest\w*)\b", re.I)

_MEETING_NOUN = r"(?:meeting|call|session|recording|sync|stand-?up|review|conversation|interview)"
_PARTICIPANTS = re.compile(
    r"\b(?:attendees?|attendance|participants?|participated|who\s+(?:all\s+)?(?:attended|joined|participated|showed up|took part)"
    r"|who(?:'s|\s+is|\s+was|\s+were|\s+are)?\s+(?:all\s+)?(?:in|on|at|there|present|part of)\b)",
    re.I,
)
_DURATION = re.compile(
    rf"\bhow long\s+(?:was|is|did|were|has)?\s*(?:this|the|our|that)?\s*{_MEETING_NOUN}\b|\bhow long was it\b"
    rf"|\bduration\b|\b{_MEETING_NOUN}\s+(?:length|duration)\b|\blength of (?:the|this) {_MEETING_NOUN}\b|\bhow many minutes\b",
    re.I,
)
_WHEN = re.compile(
    rf"\bwhen\s+(?:was|is|did|were)\s+(?:this|the|our|that)\s+{_MEETING_NOUN}\b"
    rf"|\b(?:what|which)\s+(?:date|day|time)\b[^?]*\b{_MEETING_NOUN}\b|\b{_MEETING_NOUN}\s+(?:date|time)\b"
    rf"|\bdate of (?:the|this) {_MEETING_NOUN}\b|\bwhen did (?:we|it|this) (?:meet|happen|take place|start)\b"
    r"|\bwhen was (?:this|it) (?:held|recorded|scheduled)\b",
    re.I,
)
_TALK_TIME = re.compile(
    r"\btalk[- ]?time\b|\bspeaking time\b|\bair-?time\b|\bmost (?:talkative|vocal)\b|\bwho dominated\b"
    r"|\b(?:talked|spoke|talks|speaks|talking|speaking)\s+(?:the\s+)?(?:most|longest)\b|\bwho\b[^?]*\b(?:talked|spoke|talks|speaks)\b[^?]*\bmost\b",
    re.I,
)
# "what was decided about X", "status of X", "any update on X": a topic question answered from the summary first.
_STATUS = re.compile(
    r"\b(?:decided|decide|decision|decisions|status|updates?|progress|state)\s+(?:on|about|of|for|with|regarding|around)\b"
    r"|\bwhere\s+(?:are|do|did)\s+we\s+(?:stand|land)\b",
    re.I,
)
STATUS_WORDS = frozenset(
    "decided decide decision decisions status update updates progress state stand land".split()
)


class Intent(Enum):
    EMAIL = "email"
    PARTICIPANTS = "participants"
    DURATION = "duration"
    WHEN = "when"
    TALK_TIME = "talk_time"
    ACTIONS = "actions"
    STATUS = "status"
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
    for pattern, intent in (
        (_TALK_TIME, Intent.TALK_TIME),
        (_PARTICIPANTS, Intent.PARTICIPANTS),
        (_DURATION, Intent.DURATION),
        (_WHEN, Intent.WHEN),
        (_ACTIONS, Intent.ACTIONS),
    ):
        if pattern.search(question):
            return intent, None
    if _STATUS.search(question) and content_words(question, STATUS_WORDS):
        return Intent.STATUS, None
    if _SUMMARY.search(question):
        return Intent.SUMMARY, None
    speaker = speaker_in(question, ctx)
    if speaker is not None and _SPEAKER_CUE.search(question):
        return Intent.SPEAKER, speaker
    return Intent.KEYWORD, None

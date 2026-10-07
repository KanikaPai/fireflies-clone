"""Shared types and helpers for the AskFred engines."""

import re
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.schemas.askfred import AskResponse, Citation
from app.schemas.meeting import MeetingDetail
from app.schemas.transcript import SegmentOut

MAX_CONTEXT_CHARS = 150_000
MAX_CITATIONS = 8
NOT_FOUND = "I couldn't find that in this meeting's transcript."


@dataclass(frozen=True)
class Meeting:
    detail: MeetingDetail
    segments: list[SegmentOut]
    user_name: str
    db: Session

    @property
    def by_id(self) -> dict[int, SegmentOut]:
        return {s.id: s for s in self.segments}


def cite(segment: SegmentOut) -> Citation:
    return Citation(segment_id=segment.id, start_ms=segment.start_ms, speaker=segment.speaker)


def dedupe(citations: list[Citation]) -> list[Citation]:
    seen: set[int] = set()
    out = []
    for c in citations:
        if c.segment_id not in seen:
            seen.add(c.segment_id)
            out.append(c)
    return out[:MAX_CITATIONS]


def words(text: str) -> list[str]:
    return re.findall(r"[A-Za-z0-9']+", text.lower())


def first_names(name: str) -> set[str]:
    return {t for t in re.findall(r"[A-Za-z]+", name.lower()) if len(t) >= 3}


def reply(text: str, citations: list[Citation] | None = None) -> AskResponse:
    return AskResponse(answer_markdown=text, citations=dedupe(citations or []), source="heuristic")

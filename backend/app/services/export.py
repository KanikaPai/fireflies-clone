"""Export a meeting as .txt, .md, .vtt or .json.

The .txt and .vtt outputs are written so they parse back through ``transcript_parser`` (tested), so an
export can be re-uploaded as a new meeting.
"""

import html
import json
import re
import unicodedata
from dataclasses import dataclass
from datetime import datetime
from typing import Literal

from sqlalchemy.orm import Session

from app.models import User
from app.schemas.meeting import MeetingDetail
from app.schemas.transcript import SegmentOut
from app.services import meetings, transcript

ExportFormat = Literal["txt", "md", "vtt", "json"]

MEDIA_TYPES: dict[str, str] = {
    "txt": "text/plain; charset=utf-8",
    "md": "text/markdown; charset=utf-8",
    "vtt": "text/vtt; charset=utf-8",
    "json": "application/json",
}


@dataclass(frozen=True)
class ExportFile:
    filename: str
    media_type: str
    content: str


def clock(ms: int) -> str:
    """mm:ss under an hour, h:mm:ss after (both accepted by the .txt parser)."""
    total = ms // 1000
    h, rest = divmod(total, 3600)
    m, s = divmod(rest, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"


def _vtt_time(ms: int) -> str:
    h, rest = divmod(ms, 3_600_000)
    m, rest = divmod(rest, 60_000)
    s, milli = divmod(rest, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{milli:03d}"


def _one_line(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def filename_for(title: str, meeting_date: datetime, ext: str) -> str:
    """e.g. 'sprint-planning-2026-09-25.md' (ASCII-only, safe in a Content-Disposition header)."""
    ascii_title = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_title.lower()).strip("-")[:60].strip("-") or "meeting"
    return f"{slug}-{meeting_date.date().isoformat()}.{ext}"


def to_txt(segments: list[SegmentOut]) -> str:
    return "\n".join(f"[{clock(s.start_ms)}] {s.speaker.name}: {_one_line(s.text)}" for s in segments) + "\n"


def to_vtt(segments: list[SegmentOut]) -> str:
    cues = [
        f"{i}\n{_vtt_time(s.start_ms)} --> {_vtt_time(max(s.end_ms, s.start_ms))}\n"
        f"<v {html.escape(s.speaker.name, quote=False)}>{html.escape(_one_line(s.text), quote=False)}"
        for i, s in enumerate(segments, start=1)
    ]
    return "WEBVTT\n\n" + "\n\n".join(cues) + "\n"


def to_json(meeting: MeetingDetail, segments: list[SegmentOut]) -> str:
    payload = meeting.model_dump(mode="json")
    payload["transcript"] = [s.model_dump(mode="json") for s in segments]
    return json.dumps(payload, indent=2, ensure_ascii=False) + "\n"


def to_markdown(meeting: MeetingDetail, segments: list[SegmentOut]) -> str:
    lines = [f"# {meeting.title}", ""]
    lines.append(f"- **Date:** {meeting.meeting_date.strftime('%b %d, %Y %H:%M UTC')}")
    lines.append(f"- **Duration:** {max(1, round(meeting.duration_seconds / 60))} min")
    if meeting.participants:
        lines.append(f"- **Participants:** {', '.join(p.name for p in meeting.participants)}")
    if meeting.tags:
        lines.append(f"- **Tags:** {', '.join(t.name for t in meeting.tags)}")

    if meeting.summary:
        lines += ["", "## Summary", "", meeting.summary.overview]
        if meeting.summary.keywords:
            lines += ["", f"**Keywords:** {', '.join(meeting.summary.keywords)}"]
        if meeting.summary.bullets:
            lines.append("")
            lines += [f"- **{b.label}:** {b.text} _({clock(b.start_ms)})_" for b in meeting.summary.bullets]

    if meeting.chapters:
        lines += ["", "## Notes"]
        for chapter in meeting.chapters:
            lines += ["", f"### {chapter.title} ({clock(chapter.start_ms)})"]
            if chapter.summary:
                lines += ["", chapter.summary]
            if chapter.points:
                lines.append("")
                lines += [f"- {p.text} _({clock(p.start_ms)})_" for p in chapter.points]

    if meeting.action_items:
        lines += ["", "## Action items", ""]
        for item in meeting.action_items:
            extras = []
            if item.assignee:
                extras.append(item.assignee.name)
            if item.due_date:
                extras.append(f"due {item.due_date.isoformat()}")
            suffix = f" ({', '.join(extras)})" if extras else ""
            lines.append(f"- [{'x' if item.is_completed else ' '}] {_one_line(item.text)}{suffix}")

    lines += ["", "## Transcript", ""]
    lines += [f"**{s.speaker.name}** [{clock(s.start_ms)}]: {_one_line(s.text)}\n" for s in segments] or ["_No transcript._"]
    return "\n".join(lines).rstrip() + "\n"


def export_meeting(db: Session, user: User, meeting_id: int, fmt: ExportFormat) -> ExportFile:
    meeting = meetings.get_meeting_detail(db, user, meeting_id)
    segments = transcript.get_transcript(db, user, meeting_id, None).segments
    content = {
        "txt": lambda: to_txt(segments),
        "vtt": lambda: to_vtt(segments),
        "json": lambda: to_json(meeting, segments),
        "md": lambda: to_markdown(meeting, segments),
    }[fmt]()
    return ExportFile(filename_for(meeting.title, meeting.meeting_date, fmt), MEDIA_TYPES[fmt], content)

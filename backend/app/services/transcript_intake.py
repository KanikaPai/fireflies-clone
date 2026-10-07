"""Reading transcript input (uploaded file or pasted text) and the dry-run preview. Writes nothing."""

import math
import re

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Person
from app.schemas.intake import ParsePreview, SegmentPreview, SpeakerPreview
from app.services.errors import PayloadTooLargeError, UnprocessableError
from app.services.transcript_parser import UNKNOWN_SPEAKER, ParsedSegment, detect_format, parse_transcript, sniff_format

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
PREVIEW_SEGMENTS = 5
_TIMESTAMP = re.compile(r"\d{1,2}:\d{2}")


def read_upload(filename: str, content: bytes) -> tuple[str, str]:
    """Validate an uploaded file and return (format, decoded text).

    415 unsupported extension, 413 over 5 MB, 422 empty or not UTF-8 text.
    """
    fmt = detect_format(filename)
    if len(content) > MAX_UPLOAD_BYTES:
        raise PayloadTooLargeError(f"File is too large (max {MAX_UPLOAD_BYTES // (1024 * 1024)} MB).")
    if not content.strip():
        raise UnprocessableError("The uploaded file is empty.")
    try:
        return fmt, content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise UnprocessableError("The file must be UTF-8 encoded text.") from exc


def read_pasted(text: str) -> tuple[str, str]:
    """Validate pasted text and return (sniffed format, text)."""
    if len(text.encode("utf-8")) > MAX_UPLOAD_BYTES:
        raise PayloadTooLargeError(f"Text is too large (max {MAX_UPLOAD_BYTES // (1024 * 1024)} MB).")
    if not text.strip():
        raise UnprocessableError("The transcript is empty.")
    return sniff_format(text), text


def _warnings(fmt: str, text: str, segments: list[ParsedSegment]) -> list[str]:
    warnings: list[str] = []
    unknown = sum(1 for s in segments if s.speaker == UNKNOWN_SPEAKER)
    if unknown:
        warnings.append(f"{unknown} line(s) have no speaker and will be attributed to “{UNKNOWN_SPEAKER}”.")
    if fmt == "txt" and not _TIMESTAMP.search(text):
        warnings.append("No timestamps were found, so times are estimated from the amount of text.")
    if len(segments) < 3:
        warnings.append("This transcript is very short; the summary may be thin.")
    return warnings


def preview(db: Session, fmt: str, text: str) -> ParsePreview:
    segments = parse_transcript(text, fmt)
    names = list(dict.fromkeys(s.speaker for s in segments))
    lowered = [n.lower() for n in names]
    known = {p.name.lower(): p.id for p in db.scalars(select(Person).where(func.lower(Person.name).in_(lowered)))}
    return ParsePreview(
        format_detected=fmt,
        segment_count=len(segments),
        duration_seconds=math.ceil(segments[-1].end_ms / 1000),
        speakers=[SpeakerPreview(name=n, matched_person_id=known.get(n.lower())) for n in names],
        preview=[
            SegmentPreview(speaker=s.speaker, start_ms=s.start_ms, end_ms=s.end_ms, text=s.text)
            for s in segments[:PREVIEW_SEGMENTS]
        ],
        warnings=_warnings(fmt, text, segments),
    )

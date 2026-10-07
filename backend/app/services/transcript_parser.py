"""Parse .txt, .vtt and .json transcripts into one normalised list of segments."""

import html
import json
import random
import re
import statistics
from dataclasses import dataclass
from pathlib import PurePath
from typing import Any

from app.services.errors import BadRequestError, UnprocessableError, UnsupportedMediaError
from app.services.timing import LEAD_IN_MS, pause_ms, speech_ms

SUPPORTED_FORMATS = ("txt", "vtt", "json")
UNKNOWN_SPEAKER = "Unknown Speaker"
MAX_SEGMENTS = 20_000


@dataclass(frozen=True)
class ParsedSegment:
    speaker: str
    start_ms: int
    end_ms: int
    text: str


def detect_format(filename: str) -> str:
    ext = PurePath(filename).suffix.lower().lstrip(".")
    if ext not in SUPPORTED_FORMATS:
        raise UnsupportedMediaError(f"Unsupported file type '.{ext or '(none)'}'. Upload a .txt, .vtt or .json transcript.")
    return ext


def parse_transcript(content: str, fmt: str) -> list[ParsedSegment]:
    """Parse transcript text in the given format; raises UnprocessableError if nothing usable is found."""
    content = content.lstrip("﻿")
    if not content.strip():
        raise UnprocessableError("The transcript is empty.")
    parsers = {"txt": _parse_txt, "vtt": _parse_vtt, "json": _parse_json}
    if fmt not in parsers:
        raise BadRequestError(f"Unsupported transcript format '{fmt}'.")
    segments = parsers[fmt](content)
    if not segments:
        raise UnprocessableError("No transcript segments could be found in the file.")
    if len(segments) > MAX_SEGMENTS:
        raise UnprocessableError(f"Transcript is too long ({len(segments)} segments, max {MAX_SEGMENTS}).")
    return _normalise(segments)


# --- shared helpers -------------------------------------------------------------------------------


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _normalise(segments: list[ParsedSegment]) -> list[ParsedSegment]:
    """Sort by start time and make sure spans are well-formed and never overlap the next segment."""
    ordered = sorted(segments, key=lambda s: s.start_ms)  # stable: keeps input order for ties
    result: list[ParsedSegment] = []
    for i, seg in enumerate(ordered):
        end = max(seg.end_ms, seg.start_ms)
        if i + 1 < len(ordered):
            end = min(end, max(ordered[i + 1].start_ms, seg.start_ms))
        result.append(ParsedSegment(seg.speaker, seg.start_ms, end, seg.text))
    return result


def _fill_times(
    rows: list[tuple[str, int | None, str]], rng: random.Random | None = None
) -> list[ParsedSegment]:
    """Turn (speaker, optional start_ms, text) rows into segments, estimating any missing timestamps."""
    rng = rng or random.Random(0)  # deterministic: the same upload always yields the same timings
    segments: list[ParsedSegment] = []
    cursor = LEAD_IN_MS
    for i, (speaker, start, text) in enumerate(rows):
        start_ms = max(start if start is not None else cursor, cursor if segments else 0)
        end_ms = start_ms + speech_ms(text)
        next_start = next((s for _, s, _ in rows[i + 1 :] if s is not None), None)
        if start is not None and next_start is not None and next_start >= start_ms:
            end_ms = min(end_ms, next_start)  # stay inside the gap to the next timestamped line
        segments.append(ParsedSegment(speaker, start_ms, max(end_ms, start_ms), text))
        cursor = end_ms + pause_ms(rng)
    return segments


# --- .txt -----------------------------------------------------------------------------------------

_TXT_LINE = re.compile(
    r"""^\s*
    (?:\[\s*(?:(?P<h>\d{1,2}):)?(?P<m>\d{1,2}):(?P<s>\d{2})\s*\]\s*)?   # optional [hh:mm:ss] / [mm:ss]
    (?P<speaker>[^\W\d_][\w .'\-]{0,58}?)\s*:\s+                        # "Speaker Name:"
    (?P<text>\S.*)$""",
    re.VERBOSE,
)
_TXT_TIME_ONLY = re.compile(r"^\s*\[\s*(?:(?P<h>\d{1,2}):)?(?P<m>\d{1,2}):(?P<s>\d{2})\s*\]\s*(?P<text>\S.*)$")


def _stamp_ms(match: re.Match[str]) -> int:
    return ((int(match["h"] or 0) * 60 + int(match["m"])) * 60 + int(match["s"])) * 1000


def _parse_txt(content: str) -> list[ParsedSegment]:
    rows: list[list[Any]] = []  # [speaker, start_ms | None, text]
    for raw in content.splitlines():
        line = raw.strip()
        if not line:
            continue
        m = _TXT_LINE.match(line)
        if m and len(m["speaker"].split()) <= 5:
            rows.append([_clean(m["speaker"]), _stamp_ms(m) if m["m"] else None, _clean(m["text"])])
            continue
        t = _TXT_TIME_ONLY.match(line)
        if t:  # timestamp without a speaker label
            rows.append([UNKNOWN_SPEAKER, _stamp_ms(t), _clean(t["text"])])
        elif rows:  # continuation of the previous speaker's turn
            rows[-1][2] = _clean(f"{rows[-1][2]} {line}")
        else:
            rows.append([UNKNOWN_SPEAKER, None, _clean(line)])
    if not any(r[0] != UNKNOWN_SPEAKER for r in rows):
        raise UnprocessableError("No 'Speaker Name: text' lines were found in the .txt transcript.")
    return _fill_times([(r[0], r[1], r[2]) for r in rows])


# --- .vtt -----------------------------------------------------------------------------------------

_VTT_TIME = re.compile(
    r"(?:(?P<h1>\d+):)?(?P<m1>\d{2}):(?P<s1>\d{2})[.,](?P<ms1>\d{3})\s*-->\s*"
    r"(?:(?P<h2>\d+):)?(?P<m2>\d{2}):(?P<s2>\d{2})[.,](?P<ms2>\d{3})"
)
_VTT_VOICE = re.compile(r"<v(?:\.[^\s>]*)?\s+([^>]+)>", re.IGNORECASE)
_VTT_PREFIX = re.compile(r"^([^\W\d_][\w .'\-]{0,58}?)\s*:\s+(\S.*)$", re.DOTALL)


def _vtt_ms(m: re.Match[str], n: str) -> int:
    h, mi, s, ms = (int(m[f"{k}{n}"] or 0) for k in ("h", "m", "s", "ms"))
    return ((h * 60 + mi) * 60 + s) * 1000 + ms


def _parse_vtt(content: str) -> list[ParsedSegment]:
    if not content.lstrip().startswith("WEBVTT"):
        raise UnprocessableError("Not a valid WebVTT file: the first line must be 'WEBVTT'.")
    segments: list[ParsedSegment] = []
    for block in re.split(r"\r?\n\s*\r?\n", content.replace("\r\n", "\n")):
        lines = [ln for ln in block.strip().split("\n") if ln.strip()]
        idx = next((i for i, ln in enumerate(lines) if "-->" in ln), None)
        if idx is None or lines[0].startswith(("NOTE", "STYLE", "REGION")):
            continue
        timing = _VTT_TIME.search(lines[idx])
        if not timing:
            raise UnprocessableError(f"Invalid WebVTT cue timing: '{lines[idx].strip()}'.")
        raw = " ".join(lines[idx + 1 :])
        voice = _VTT_VOICE.search(raw)
        speaker = _clean(html.unescape(voice.group(1))) if voice else None
        text = _clean(html.unescape(re.sub(r"<[^>]+>", "", raw)))
        if speaker is None and (prefixed := _VTT_PREFIX.match(text)):
            speaker, text = _clean(prefixed.group(1)), _clean(prefixed.group(2))
        if text:
            segments.append(ParsedSegment(speaker or UNKNOWN_SPEAKER, _vtt_ms(timing, "1"), _vtt_ms(timing, "2"), text))
    return segments


# --- .json ----------------------------------------------------------------------------------------


def _parse_json(content: str) -> list[ParsedSegment]:
    try:
        data = json.loads(content)
    except json.JSONDecodeError as exc:
        raise UnprocessableError(f"Invalid JSON: {exc.msg} (line {exc.lineno}, column {exc.colno}).") from exc
    if isinstance(data, dict) and isinstance(data.get("segments"), list):
        data = data["segments"]
    if not isinstance(data, list):
        raise UnprocessableError("Expected a JSON array of {speaker, start, end, text} objects.")

    rows: list[tuple[str, float, float | None, str]] = []
    for i, item in enumerate(data):
        if not isinstance(item, dict) or not isinstance(item.get("text"), str) or not item["text"].strip():
            raise UnprocessableError(f"Item {i} must be an object with a non-empty 'text' string.")
        start, end = item.get("start"), item.get("end")
        if isinstance(start, bool) or not isinstance(start, (int, float)) or start < 0:
            raise UnprocessableError(f"Item {i} needs a non-negative numeric 'start'.")
        if end is not None and (isinstance(end, bool) or not isinstance(end, (int, float)) or end < start):
            raise UnprocessableError(f"Item {i} has an invalid 'end' (must be a number >= 'start').")
        speaker = item.get("speaker")
        speaker = _clean(speaker) if isinstance(speaker, str) and speaker.strip() else UNKNOWN_SPEAKER
        rows.append((speaker, float(start), None if end is None else float(end), _clean(item["text"])))

    factor = 1 if _json_uses_ms(rows) else 1000
    segments: list[ParsedSegment] = []
    for i, (speaker, start, end, text) in enumerate(rows):
        start_ms = int(round(start * factor))
        if end is not None:
            end_ms = int(round(end * factor))
        else:
            nxt = rows[i + 1][1] * factor if i + 1 < len(rows) else None
            end_ms = start_ms + speech_ms(text)
            if nxt is not None and nxt >= start_ms:
                end_ms = min(end_ms, int(nxt))
        segments.append(ParsedSegment(speaker, start_ms, end_ms, text))
    return segments


def _json_uses_ms(rows: list[tuple[str, float, float | None, str]]) -> bool:
    """Detect milliseconds vs seconds. Fractional values mean seconds; otherwise a value >= 100000
    (over 27 hours as seconds) or a median segment length over 5 minutes as seconds means milliseconds."""
    values = [v for _, s, e, _ in rows for v in (s, e) if v is not None]
    if not values or any(v != int(v) for v in values):
        return False
    if max(values) >= 100_000:
        return True
    lengths = [e - s for _, s, e, _ in rows if e is not None]
    return bool(lengths) and statistics.median(lengths) > 300


def sniff_format(text: str) -> str:
    """Guess the format of pasted text: WebVTT header, JSON document, otherwise plain 'Speaker: text' lines."""
    head = text.lstrip("\ufeff").lstrip()
    if head.startswith("WEBVTT"):
        return "vtt"
    if head[:1] in "[{":
        try:
            json.loads(head)
            return "json"
        except ValueError:
            pass
    return "txt"

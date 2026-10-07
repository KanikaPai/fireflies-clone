"""Seed the database with a demo user, people, tags and fully-processed meetings.

Run with ``python -m app.seed.seed`` (drops and recreates all data). The API also calls
``seed_if_empty`` on startup so fresh deployments come up with demo content.

Content lives in ``data/*.json``. Transcript timestamps are derived here from the text length
(speaking rate plus short pauses), so segments never overlap and chapters/action items stay
aligned with the transcript by construction.
"""

import json
import math
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.db import Base, SessionLocal, engine, init_db
from app.models import (
    ActionItem,
    Chapter,
    GeneratedBy,
    Meeting,
    MeetingParticipant,
    MeetingStatus,
    ParticipantRole,
    Person,
    Platform,
    Summary,
    Tag,
    TranscriptSegment,
    User,
)
from app.models.fts import rebuild_fts
from app.services.timing import layout_timestamps

DATA_DIR = Path(__file__).parent / "data"
MEETINGS_DIR = DATA_DIR / "meetings"


def _load(path: Path) -> Any:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def _validate(spec: dict[str, Any], n_segments: int, n_chapters: int) -> None:
    title = spec["title"]
    checks = {
        "segments (40-80)": (n_segments, 40, 80),
        "keywords (5-8)": (len(spec["summary"]["keywords"]), 5, 8),
        "chapters (3-6)": (n_chapters, 3, 6),
        "action items (3-6)": (len(spec["action_items"]), 3, 6),
        "tags (1-3)": (len(spec["tags"]), 1, 3),
        "bullets (5-7)": (len(spec["summary"]["bullets"]), 5, 7),
    }
    for label, (value, lo, hi) in checks.items():
        if not lo <= value <= hi:
            raise ValueError(f"{title}: {label} out of range, got {value}")


def _anchor(lines: list[list[str]], spans: list[tuple[int, int]], needle: str, title: str) -> int:
    """Start time of the first segment whose text contains `needle` (case-insensitive)."""
    wanted = needle.lower()
    for index, row in enumerate(lines):
        if wanted in row[1].lower():
            return spans[index][0]
    raise ValueError(f"{title}: no segment contains the anchor text {needle!r}")


def _build_meeting(
    session: Session,
    spec: dict[str, Any],
    owner: User,
    people: dict[str, Person],
    tags: dict[str, Tag],
    now: datetime,
    rng: random.Random,
) -> Meeting:
    lines = [row for row in spec["transcript"] if isinstance(row, list)]
    _validate(spec, len(lines), sum(isinstance(row, dict) for row in spec["transcript"]))
    spans = layout_timestamps([row[1] for row in lines], rng)
    if "target_minutes" in spec:  # stretch/compress the whole timeline so meeting lengths vary realistically
        factor = spec["target_minutes"] * 60_000 / (spans[-1][1] + 15_000)
        spans = [(int(a * factor), int(b * factor)) for a, b in spans]
    duration_seconds = math.ceil(spans[-1][1] / 1000) + rng.randint(5, 25)
    if not 10 * 60 <= duration_seconds <= 60 * 60:
        raise ValueError(f"{spec['title']}: duration {duration_seconds}s outside 10-60 minutes")

    meeting_date = (now - timedelta(days=spec["days_ago"])).replace(
        hour=spec["start_hour"], minute=spec.get("start_minute", 0), second=0, microsecond=0
    )
    ended_at = meeting_date + timedelta(seconds=duration_seconds)
    meeting = Meeting(
        owner=owner,
        title=spec["title"],
        meeting_date=meeting_date,
        duration_seconds=duration_seconds,
        platform=Platform(spec["platform"]),
        media_url=spec.get("media_url"),
        status=MeetingStatus.READY,
        created_at=ended_at,
        updated_at=ended_at,
        tags=[tags[name] for name in spec["tags"]],
    )

    speaker_keys = list(dict.fromkeys(row[0] for row in lines))
    for key in dict.fromkeys(speaker_keys + spec.get("silent_attendees", [])):
        role = ParticipantRole.HOST if key == spec["host"] else ParticipantRole.ATTENDEE
        meeting.participants.append(MeetingParticipant(person=people[key], role=role))

    segments: dict[str, TranscriptSegment] = {}  # action-item key -> segment it was said in
    segment_index = 0
    chapter_starts: list[tuple[dict[str, Any], int]] = []
    for row in spec["transcript"]:
        if isinstance(row, dict):  # chapter marker: begins at the next segment
            chapter_starts.append((row, segment_index))
            continue
        start_ms, end_ms = spans[segment_index]
        segment = TranscriptSegment(
            speaker=people[row[0]],
            start_ms=start_ms,
            end_ms=end_ms,
            text=row[1],
            sequence_index=segment_index,
        )
        meeting.segments.append(segment)
        if len(row) > 2:
            segments[row[2]] = segment
        segment_index += 1

    for order, (marker, first) in enumerate(chapter_starts):
        last = (chapter_starts[order + 1][1] if order + 1 < len(chapter_starts) else len(lines)) - 1
        points = sorted(
            ({"text": p["text"], "start_ms": _anchor(lines, spans, p["at"], spec["title"])} for p in marker["points"]),
            key=lambda p: p["start_ms"],
        )
        if not 2 <= len(points) <= 4:
            raise ValueError(f"{spec['title']}: chapter {marker['chapter']!r} needs 2-4 points, got {len(points)}")
        meeting.chapters.append(
            Chapter(
                points=points,
                title=marker["chapter"],
                summary=marker["summary"],
                start_ms=spans[first][0],
                end_ms=spans[last][1],
                order_index=order,
            )
        )

    meeting.summary = Summary(
        overview=spec["summary"]["overview"],
        keywords=spec["summary"]["keywords"],
        bullets=sorted(
            (
                {"label": b["label"], "text": b["text"], "start_ms": _anchor(lines, spans, b["at"], spec["title"])}
                for b in spec["summary"]["bullets"]
            ),
            key=lambda b: b["start_ms"],
        ),
        generated_by=GeneratedBy.SEED,
        created_at=ended_at,
    )

    for item in spec["action_items"]:
        due = (meeting_date + timedelta(days=item["due_in_days"])).date() if "due_in_days" in item else None
        meeting.action_items.append(
            ActionItem(
                text=item["text"],
                assignee=people[item["assignee"]] if item.get("assignee") else None,
                source_segment=segments[item["source"]] if item.get("source") else None,
                is_completed=item.get("completed", False),
                due_date=due,
                created_at=ended_at,
                updated_at=ended_at,
            )
        )
    session.add(meeting)
    return meeting


def seed_all(session: Session) -> None:
    rng = random.Random(42)  # deterministic demo data
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    base = _load(DATA_DIR / "people.json")

    user = User(**base["user"])
    people = {p["key"]: Person(**{k: v for k, v in p.items() if k != "key"}) for p in base["people"]}
    tags = {t["name"]: Tag(**t) for t in base["tags"]}
    session.add_all([user, *people.values(), *tags.values()])

    for path in sorted(MEETINGS_DIR.glob("*.json")):
        _build_meeting(session, _load(path), user, people, tags, now, rng)
    session.commit()

    # Triggers already keep the index in sync; a rebuild guarantees consistency after bulk loads.
    rebuild_fts(session.connection())
    session.commit()


def reset_and_seed() -> None:
    from app.models.fts import drop_fts

    with engine.begin() as conn:
        drop_fts(conn)
    Base.metadata.drop_all(engine)
    init_db()
    with SessionLocal() as session:
        seed_all(session)


def seed_if_empty() -> bool:
    """Seed only when there are no users yet. Returns True if seeding ran."""
    with SessionLocal() as session:
        if session.scalar(select(func.count()).select_from(User)):
            return False
        seed_all(session)
        return True


def table_counts() -> dict[str, int]:
    with SessionLocal() as session:
        counts = {name: session.scalar(text(f"SELECT COUNT(*) FROM {name}")) or 0 for name in Base.metadata.tables}
        counts["transcript_fts (index rows)"] = (
            session.scalar(text("SELECT COUNT(*) FROM transcript_fts_docsize")) or 0
        )
        return counts


def main() -> None:
    reset_and_seed()
    for name, count in sorted(table_counts().items()):
        print(f"{name:32} {count}")


if __name__ == "__main__":
    main()

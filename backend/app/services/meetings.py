import math
from datetime import date, datetime, time, timedelta, timezone
from typing import Literal

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    ActionItem,
    Meeting,
    MeetingParticipant,
    MeetingStatus,
    ParticipantRole,
    Person,
    Platform,
    Tag,
    TranscriptSegment,
    User,
)
from app.models.mixins import utcnow
from app.schemas.action_item import ActionItemOut
from app.schemas.meeting import (
    MeetingCreate,
    MeetingDetail,
    MeetingListItem,
    MeetingPage,
    MeetingUpdate,
    ParticipantOut,
)
from app.schemas.person import PersonBrief
from app.schemas.summary import ChapterOut, SummaryBullet, SummaryOut
from app.schemas.tag import TagOut
from app.services import meeting_analysis, people, tags, transcript_intake
from app.services import settings as settings_service
from app.services.errors import BadRequestError, ConflictError, NotFoundError, UnprocessableError
from app.services.transcript_parser import ParsedSegment, parse_transcript

MAX_UPLOAD_BYTES = transcript_intake.MAX_UPLOAD_BYTES
FEED_BULLETS = 5

_DETAIL_OPTIONS = (
    selectinload(Meeting.participants).selectinload(MeetingParticipant.person),
    selectinload(Meeting.tags),
    selectinload(Meeting.summary),
    selectinload(Meeting.chapters),
    selectinload(Meeting.action_items).selectinload(ActionItem.assignee),
    selectinload(Meeting.action_items).selectinload(ActionItem.source_segment),
)


def get_owned_meeting(db: Session, user: User, meeting_id: int, *options) -> Meeting:  # type: ignore[no-untyped-def]
    meeting = db.scalar(
        select(Meeting)
        .where(Meeting.id == meeting_id, Meeting.owner_id == user.id)
        .options(*options)
        .execution_options(populate_existing=True)
    )
    if meeting is None:
        raise NotFoundError(f"Meeting {meeting_id} not found.")
    return meeting


def _participants_sorted(meeting: Meeting) -> list[MeetingParticipant]:
    return sorted(meeting.participants, key=lambda p: (p.role != ParticipantRole.HOST, p.person.name.lower()))


# --- reads ----------------------------------------------------------------------------------------


def list_meetings(
    db: Session,
    user: User,
    *,
    q: str | None,
    participant_id: int | None,
    tag_ids: list[int] | None,
    date_from: date | None,
    date_to: date | None,
    status: MeetingStatus | None,
    platform: Platform | None,
    min_duration: int | None,
    max_duration: int | None,
    processed_since: datetime | None,
    sort: Literal["recent", "oldest"],
    page: int,
    page_size: int,
) -> MeetingPage:
    filters = [Meeting.owner_id == user.id]
    if q and q.strip():
        escaped = q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        filters.append(Meeting.title.ilike(f"%{escaped}%", escape="\\"))
    if participant_id is not None:
        filters.append(Meeting.participants.any(MeetingParticipant.person_id == participant_id))
    if tag_ids:
        filters.append(Meeting.tags.any(Tag.id.in_(tag_ids)))  # OR semantics across tags
    if status is not None:
        filters.append(Meeting.status == status)
    if platform is not None:
        filters.append(Meeting.platform == platform)
    if processed_since is not None:
        filters.append(Meeting.processed_at >= processed_since)
    if min_duration is not None:
        filters.append(Meeting.duration_seconds >= min_duration)
    if max_duration is not None:
        filters.append(Meeting.duration_seconds <= max_duration)
    if date_from is not None:
        filters.append(Meeting.meeting_date >= datetime.combine(date_from, time.min, tzinfo=timezone.utc))
    if date_to is not None:
        filters.append(
            Meeting.meeting_date < datetime.combine(date_to + timedelta(days=1), time.min, tzinfo=timezone.utc)
        )

    # One aggregate query for action-item counts instead of a query per meeting.
    counts = (
        select(
            ActionItem.meeting_id.label("meeting_id"),
            func.count().label("total"),
            func.sum(case((ActionItem.is_completed.is_(False), 1), else_=0)).label("open"),
        )
        .group_by(ActionItem.meeting_id)
        .subquery()
    )
    order = (
        (Meeting.meeting_date.asc(), Meeting.id.asc())
        if sort == "oldest"
        else (Meeting.meeting_date.desc(), Meeting.id.desc())
    )
    rows = db.execute(
        select(Meeting, func.coalesce(counts.c.total, 0), func.coalesce(counts.c.open, 0))
        .outerjoin(counts, counts.c.meeting_id == Meeting.id)
        .where(*filters)
        .options(
            selectinload(Meeting.participants).selectinload(MeetingParticipant.person),
            selectinload(Meeting.tags),
            selectinload(Meeting.summary),
        )
        .order_by(*order)
        .limit(page_size)
        .offset((page - 1) * page_size)
    ).all()
    total = db.scalar(select(func.count()).select_from(Meeting).where(*filters)) or 0

    items = [
        MeetingListItem(
            id=m.id,
            title=m.title,
            meeting_date=m.meeting_date,
            duration_seconds=m.duration_seconds,
            platform=m.platform,
            status=m.status,
            error_message=m.error_message,
            processed_at=m.processed_at,
            participants=[PersonBrief.model_validate(p.person) for p in _participants_sorted(m)],
            tags=[TagOut.model_validate(t) for t in sorted(m.tags, key=lambda t: t.name.lower())],
            action_item_count=int(total_items),
            open_action_item_count=int(open_items),
            summary_bullets=[SummaryBullet(**b) for b in (m.summary.bullets if m.summary else [])[:FEED_BULLETS]],
        )
        for m, total_items, open_items in rows
    ]
    return MeetingPage(items=items, total=total, page=page, page_size=page_size)


def _to_detail(meeting: Meeting) -> MeetingDetail:
    return MeetingDetail(
        id=meeting.id,
        title=meeting.title,
        meeting_date=meeting.meeting_date,
        duration_seconds=meeting.duration_seconds,
        platform=meeting.platform,
        status=meeting.status,
        media_url=meeting.media_url,
        error_message=meeting.error_message,
        processed_at=meeting.processed_at,
        privacy=meeting.privacy,
        created_at=meeting.created_at,
        updated_at=meeting.updated_at,
        participants=[
            ParticipantOut(
                id=p.person.id, name=p.person.name, email=p.person.email, avatar_color=p.person.avatar_color, role=p.role
            )
            for p in _participants_sorted(meeting)
        ],
        tags=[TagOut.model_validate(t) for t in sorted(meeting.tags, key=lambda t: t.name.lower())],
        summary=SummaryOut.model_validate(meeting.summary) if meeting.summary else None,
        chapters=[ChapterOut.model_validate(c) for c in meeting.chapters],
        action_items=[ActionItemOut.model_validate(a) for a in sorted(meeting.action_items, key=lambda a: a.id)],
    )


def get_meeting_detail(db: Session, user: User, meeting_id: int) -> MeetingDetail:
    return _to_detail(get_owned_meeting(db, user, meeting_id, *_DETAIL_OPTIONS))


# --- creation -------------------------------------------------------------------------------------


def _build_segments(meeting: Meeting, segments: list[ParsedSegment], resolved: dict[str, Person]) -> None:
    meeting.segments = [
        TranscriptSegment(
            speaker=resolved[s.speaker.strip().lower()],
            start_ms=s.start_ms,
            end_ms=s.end_ms,
            text=s.text,
            sequence_index=i,
        )
        for i, s in enumerate(segments)
    ]
    meeting.duration_seconds = math.ceil(segments[-1].end_ms / 1000)


def _create(
    db: Session,
    user: User,
    *,
    title: str,
    meeting_date: datetime,
    platform: Platform,
    participant_names: list[str],
    segments: list[ParsedSegment] | None,
    participant_ids: list[int] | None = None,
    tag_ids: list[int] | None = None,
    duration_seconds: int | None = None,
) -> MeetingDetail:
    """Save the meeting and its transcript. With a transcript it is ``processing`` and the caller queues
    ``processing.process_meeting``; without one it is simply ``ready`` (nothing to generate)."""
    speakers = [s.speaker for s in segments] if segments else []
    explicit = [n.strip() for n in participant_names if n.strip()]
    resolved = people.get_or_create_many(db, explicit + speakers)
    host_key = (explicit or speakers or [""])[0].lower()
    by_id = _people_by_ids(db, participant_ids or [])

    meeting = Meeting(
        owner_id=user.id,
        title=title.strip(),
        meeting_date=meeting_date,
        platform=platform,
        status=MeetingStatus.PROCESSING if segments else MeetingStatus.READY,
        duration_seconds=duration_seconds or 0,
        privacy=settings_service.get_settings(db, user).default_privacy,
    )
    meeting.participants = [
        MeetingParticipant(person=person, role=ParticipantRole.HOST if key == host_key else ParticipantRole.ATTENDEE)
        for key, person in resolved.items()
    ]
    known = {p.person.id for p in meeting.participants}
    meeting.participants += [MeetingParticipant(person=p, role=ParticipantRole.ATTENDEE) for p in by_id if p.id not in known]
    if meeting.participants and not any(p.role == ParticipantRole.HOST for p in meeting.participants):
        meeting.participants[0].role = ParticipantRole.HOST
    if tag_ids:
        meeting.tags = tags.get_many(db, tag_ids)
    if segments:
        _build_segments(meeting, segments, resolved)
    db.add(meeting)
    db.commit()
    return get_meeting_detail(db, user, meeting.id)


def _people_by_ids(db: Session, ids: list[int]) -> list[Person]:
    unique = list(dict.fromkeys(ids))
    found = list(db.scalars(select(Person).where(Person.id.in_(unique)))) if unique else []
    if missing := set(unique) - {p.id for p in found}:
        raise UnprocessableError(f"Unknown person id(s): {sorted(missing)}")
    return found


def create_meeting(db: Session, user: User, data: MeetingCreate) -> MeetingDetail:
    pasted = data.transcript_text
    segments = None
    if pasted and pasted.strip():
        fmt, text = transcript_intake.read_pasted(pasted)
        segments = parse_transcript(text, fmt)
    return _create(
        db,
        user,
        title=data.title,
        meeting_date=data.meeting_date,
        platform=data.platform,
        participant_names=data.participants,
        participant_ids=data.participant_ids,
        tag_ids=data.tag_ids,
        duration_seconds=data.duration_seconds,
        segments=segments,
    )


def create_meeting_from_file(
    db: Session, user: User, *, filename: str, content: bytes, title: str, meeting_date: datetime, platform: Platform
) -> MeetingDetail:
    fmt, text = transcript_intake.read_upload(filename, content)
    return _create(
        db,
        user,
        title=title,
        meeting_date=meeting_date,
        platform=platform,
        participant_names=[],
        segments=parse_transcript(text, fmt),
    )


# --- update / delete ------------------------------------------------------------------------------


def update_meeting(db: Session, user: User, meeting_id: int, data: MeetingUpdate) -> MeetingDetail:
    meeting = get_owned_meeting(db, user, meeting_id, *_DETAIL_OPTIONS)
    if data.title is not None:
        meeting.title = data.title.strip()
    if data.meeting_date is not None:
        meeting.meeting_date = data.meeting_date
    if data.participant_ids is not None:
        ids = list(dict.fromkeys(data.participant_ids))
        found = {p.id for p in db.scalars(select(Person).where(Person.id.in_(ids)))} if ids else set()
        if missing := set(ids) - found:
            raise BadRequestError(f"Unknown person id(s): {sorted(missing)}")
        current = {p.person_id: p for p in meeting.participants}
        meeting.participants = [current.get(pid) or MeetingParticipant(person_id=pid) for pid in ids]
    if data.tag_ids is not None:
        meeting.tags = tags.get_many(db, data.tag_ids)
    if data.privacy is not None:
        meeting.privacy = data.privacy
    meeting.updated_at = utcnow()
    db.commit()
    return get_meeting_detail(db, user, meeting_id)


def delete_meeting(db: Session, user: User, meeting_id: int) -> None:
    db.delete(get_owned_meeting(db, user, meeting_id))  # children are removed by ON DELETE CASCADE
    db.commit()


def bulk_delete_meetings(db: Session, user: User, ids: list[int]) -> int:
    """Delete several meetings in one transaction; any unknown (or not owned) id aborts the whole request."""
    unique = list(dict.fromkeys(ids))
    found = list(db.scalars(select(Meeting).where(Meeting.id.in_(unique), Meeting.owner_id == user.id)))
    if missing := set(unique) - {m.id for m in found}:
        raise NotFoundError(f"Meeting(s) not found: {sorted(missing)}")
    for meeting in found:
        db.delete(meeting)
    db.commit()
    return len(found)


def regenerate_summary(db: Session, user: User, meeting_id: int) -> MeetingDetail:
    meeting = get_owned_meeting(db, user, meeting_id)
    meeting_analysis.generate_and_store(db, meeting)
    meeting.updated_at = utcnow()
    db.commit()
    return get_meeting_detail(db, user, meeting_id)


def retry_processing(db: Session, user: User, meeting_id: int) -> MeetingDetail:
    """Put a failed meeting back to ``processing`` (the caller queues the work). 409 if it did not fail."""
    meeting = get_owned_meeting(db, user, meeting_id)
    if meeting.status != MeetingStatus.FAILED:
        raise ConflictError("Only meetings whose processing failed can be retried.")
    meeting.status, meeting.error_message = MeetingStatus.PROCESSING, None
    meeting.updated_at = utcnow()
    db.commit()
    return get_meeting_detail(db, user, meeting_id)


def attach_transcript(db: Session, user: User, meeting_id: int, fmt: str, text: str) -> MeetingDetail:
    """Add a transcript to a meeting that has none and start processing it. 409 if it already has one."""
    meeting = get_owned_meeting(db, user, meeting_id)
    if db.scalar(select(func.count()).select_from(TranscriptSegment).where(TranscriptSegment.meeting_id == meeting.id)):
        raise ConflictError("This meeting already has a transcript.")
    segments = parse_transcript(text, fmt)
    resolved = people.get_or_create_many(db, [s.speaker for s in segments])
    have = {p.person_id for p in meeting.participants}
    for person in resolved.values():
        if person.id not in have:
            meeting.participants.append(MeetingParticipant(person=person, role=ParticipantRole.ATTENDEE))
    if not any(p.role == ParticipantRole.HOST for p in meeting.participants):
        meeting.participants[0].role = ParticipantRole.HOST
    _build_segments(meeting, segments, resolved)
    meeting.status, meeting.error_message = MeetingStatus.PROCESSING, None
    meeting.updated_at = utcnow()
    db.commit()
    return get_meeting_detail(db, user, meeting_id)

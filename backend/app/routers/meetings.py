from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, File, Form, Query, Response, UploadFile, status

from app.deps import CurrentUser, DbSession
from app.models import Platform
from app.schemas.common import UtcDatetime
from app.schemas.meeting import MeetingCreate, MeetingDetail, MeetingPage, MeetingUpdate
from app.schemas.transcript import TranscriptOut
from app.services import meetings, transcript
from app.services.meetings import MAX_UPLOAD_BYTES

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


@router.get("", response_model=MeetingPage, summary="List meetings")
def list_meetings(
    db: DbSession,
    user: CurrentUser,
    q: Annotated[str | None, Query(description="Case-insensitive title search")] = None,
    participant_id: int | None = None,
    tag_id: int | None = None,
    date_from: Annotated[date | None, Query(description="Inclusive, UTC")] = None,
    date_to: Annotated[date | None, Query(description="Inclusive, UTC")] = None,
    sort: Literal["recent", "oldest"] = "recent",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> MeetingPage:
    return meetings.list_meetings(
        db, user, q=q, participant_id=participant_id, tag_id=tag_id, date_from=date_from,
        date_to=date_to, sort=sort, page=page, page_size=page_size,
    )  # fmt: skip


@router.post("", response_model=MeetingDetail, status_code=status.HTTP_201_CREATED, summary="Create a meeting")
def create_meeting(data: MeetingCreate, db: DbSession, user: CurrentUser) -> MeetingDetail:
    return meetings.create_meeting(db, user, data)


@router.post(
    "/upload",
    response_model=MeetingDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Create a meeting from a transcript file (.txt, .vtt or .json)",
)
def upload_meeting(
    db: DbSession,
    user: CurrentUser,
    file: Annotated[UploadFile, File(description="Transcript file: .txt, .vtt or .json")],
    title: Annotated[str, Form(min_length=1, max_length=255)],
    meeting_date: Annotated[UtcDatetime, Form()],
    platform: Annotated[Platform, Form()] = Platform.UPLOAD,
) -> MeetingDetail:
    content = file.file.read(MAX_UPLOAD_BYTES + 1)  # read one extra byte so oversize files are detected
    return meetings.create_meeting_from_file(
        db, user, filename=file.filename or "", content=content, title=title, meeting_date=meeting_date,
        platform=platform,
    )  # fmt: skip


@router.get("/{meeting_id}", response_model=MeetingDetail, summary="Get meeting detail")
def get_meeting(meeting_id: int, db: DbSession, user: CurrentUser) -> MeetingDetail:
    return meetings.get_meeting_detail(db, user, meeting_id)


@router.patch("/{meeting_id}", response_model=MeetingDetail, summary="Update title, date, participants or tags")
def update_meeting(meeting_id: int, data: MeetingUpdate, db: DbSession, user: CurrentUser) -> MeetingDetail:
    return meetings.update_meeting(db, user, meeting_id, data)


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a meeting")
def delete_meeting(meeting_id: int, db: DbSession, user: CurrentUser) -> Response:
    meetings.delete_meeting(db, user, meeting_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{meeting_id}/transcript", response_model=TranscriptOut, summary="Get the transcript")
def get_transcript(
    meeting_id: int,
    db: DbSession,
    user: CurrentUser,
    q: Annotated[str | None, Query(description="If set, matching_segment_ids lists segments matching this text")] = None,
) -> TranscriptOut:
    return transcript.get_transcript(db, user, meeting_id, q)


@router.post(
    "/{meeting_id}/summary/regenerate",
    response_model=MeetingDetail,
    summary="Regenerate summary and chapters",
    description="Regenerates the overview, keywords and chapters. Action items are only generated if the "
    "meeting has none, so existing tasks are never overwritten.",
)
def regenerate_summary(meeting_id: int, db: DbSession, user: CurrentUser) -> MeetingDetail:
    return meetings.regenerate_summary(db, user, meeting_id)

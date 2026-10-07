from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import MeetingShare, User
from app.schemas.share import ShareCreate, ShareOut
from app.services import meetings
from app.services.errors import ConflictError, NotFoundError


def list_shares(db: Session, user: User, meeting_id: int) -> list[ShareOut]:
    meeting = meetings.get_owned_meeting(db, user, meeting_id)
    return [ShareOut.model_validate(s) for s in db.scalars(select(MeetingShare).where(MeetingShare.meeting_id == meeting.id).order_by(MeetingShare.id))]


def create_share(db: Session, user: User, meeting_id: int, data: ShareCreate) -> ShareOut:
    meeting = meetings.get_owned_meeting(db, user, meeting_id)
    email = data.email.lower()
    if db.scalar(select(MeetingShare.id).where(MeetingShare.meeting_id == meeting.id, MeetingShare.email == email)):
        raise ConflictError(f"Already shared with {email}.")
    share = MeetingShare(meeting_id=meeting.id, email=email)
    db.add(share)
    db.commit()
    return ShareOut.model_validate(share)


def delete_share(db: Session, user: User, meeting_id: int, share_id: int) -> None:
    meeting = meetings.get_owned_meeting(db, user, meeting_id)
    share = db.get(MeetingShare, share_id)
    if share is None or share.meeting_id != meeting.id:
        raise NotFoundError(f"Share {share_id} not found.")
    db.delete(share)
    db.commit()

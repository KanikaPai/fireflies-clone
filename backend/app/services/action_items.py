from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models import ActionItem, Meeting, Person, TranscriptSegment, User
from app.models.mixins import utcnow
from app.schemas.action_item import ActionItemCreate, ActionItemOut, ActionItemUpdate, ActionItemWithMeeting
from app.services import meetings as meeting_service
from app.services.errors import BadRequestError, NotFoundError, UnprocessableError


def _check_assignee(db: Session, assignee_id: int | None) -> None:
    if assignee_id is not None and db.get(Person, assignee_id) is None:
        raise UnprocessableError(f"Person {assignee_id} does not exist.")


def _check_source_segment(db: Session, meeting_id: int, segment_id: int | None) -> None:
    if segment_id is None:
        return
    segment = db.get(TranscriptSegment, segment_id)
    if segment is None or segment.meeting_id != meeting_id:
        raise UnprocessableError("source_segment_id must be a segment of this meeting.")


def _load(db: Session, user: User, item_id: int) -> ActionItem:
    item = db.scalar(
        select(ActionItem)
        .join(Meeting, Meeting.id == ActionItem.meeting_id)
        .where(ActionItem.id == item_id, Meeting.owner_id == user.id)
        .options(selectinload(ActionItem.assignee), selectinload(ActionItem.source_segment))
        .execution_options(populate_existing=True)
    )
    if item is None:
        raise NotFoundError(f"Action item {item_id} not found.")
    return item


def create_action_item(db: Session, user: User, meeting_id: int, data: ActionItemCreate) -> ActionItemOut:
    meeting = meeting_service.get_owned_meeting(db, user, meeting_id)
    _check_assignee(db, data.assignee_id)
    _check_source_segment(db, meeting.id, data.source_segment_id)
    item = ActionItem(meeting_id=meeting.id, **data.model_dump())
    db.add(item)
    db.commit()
    return ActionItemOut.model_validate(_load(db, user, item.id))


def update_action_item(db: Session, user: User, item_id: int, data: ActionItemUpdate) -> ActionItemOut:
    item = _load(db, user, item_id)
    changes = data.model_dump(exclude_unset=True)
    for required in ("text", "is_completed"):
        if required in changes and changes[required] is None:
            raise BadRequestError(f"'{required}' cannot be null.")
    if "assignee_id" in changes:
        _check_assignee(db, changes["assignee_id"])
    if "source_segment_id" in changes:
        _check_source_segment(db, item.meeting_id, changes["source_segment_id"])
    for field, value in changes.items():
        setattr(item, field, value)
    item.updated_at = utcnow()
    db.commit()
    return ActionItemOut.model_validate(_load(db, user, item_id))


def delete_action_item(db: Session, user: User, item_id: int) -> None:
    db.delete(_load(db, user, item_id))
    db.commit()


def list_action_items(db: Session, user: User, completed: bool | None) -> list[ActionItemWithMeeting]:
    """All of the user's action items across meetings, newest meeting first."""
    stmt = (
        select(ActionItem)
        .join(Meeting, Meeting.id == ActionItem.meeting_id)
        .where(Meeting.owner_id == user.id)
        .options(joinedload(ActionItem.meeting), selectinload(ActionItem.assignee), selectinload(ActionItem.source_segment))
        .order_by(Meeting.meeting_date.desc(), Meeting.id.desc(), ActionItem.id)
    )
    if completed is not None:
        stmt = stmt.where(ActionItem.is_completed.is_(completed))
    return [
        ActionItemWithMeeting(
            **ActionItemOut.model_validate(item).model_dump(),
            meeting_title=item.meeting.title,
            meeting_date=item.meeting.meeting_date,
        )
        for item in db.scalars(stmt)
    ]

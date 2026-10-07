from typing import Annotated

from fastapi import APIRouter, Query, Response, status

from app.deps import CurrentUser, DbSession
from app.schemas.action_item import ActionItemCreate, ActionItemOut, ActionItemUpdate, ActionItemWithMeeting
from app.services import action_items

router = APIRouter(tags=["action items"])


@router.get(
    "/api/action-items",
    response_model=list[ActionItemWithMeeting],
    summary="List action items across all meetings",
)
def list_action_items(
    db: DbSession,
    user: CurrentUser,
    completed: Annotated[bool | None, Query(description="Only completed (true) or open (false) items")] = None,
) -> list[ActionItemWithMeeting]:
    return action_items.list_action_items(db, user, completed)


@router.post(
    "/api/meetings/{meeting_id}/action-items",
    response_model=ActionItemOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add an action item to a meeting",
)
def create_action_item(meeting_id: int, data: ActionItemCreate, db: DbSession, user: CurrentUser) -> ActionItemOut:
    return action_items.create_action_item(db, user, meeting_id, data)


@router.patch("/api/action-items/{item_id}", response_model=ActionItemOut, summary="Update an action item")
def update_action_item(item_id: int, data: ActionItemUpdate, db: DbSession, user: CurrentUser) -> ActionItemOut:
    return action_items.update_action_item(db, user, item_id, data)


@router.delete("/api/action-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete an action item")
def delete_action_item(item_id: int, db: DbSession, user: CurrentUser) -> Response:
    action_items.delete_action_item(db, user, item_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

import { apiFetch } from "./client";
import type { ActionItem, ActionItemCreate, ActionItemUpdate, ActionItemWithMeeting } from "./types";

export const listActionItems = (completed?: boolean, signal?: AbortSignal) =>
  apiFetch<ActionItemWithMeeting[]>("/api/action-items", { query: { completed }, signal });

export const updateActionItem = (id: number, body: ActionItemUpdate) =>
  apiFetch<ActionItem>(`/api/action-items/${id}`, { method: "PATCH", json: body });

export const deleteActionItem = (id: number) => apiFetch<void>(`/api/action-items/${id}`, { method: "DELETE" });

export const createActionItem = (meetingId: number, body: ActionItemCreate) =>
  apiFetch<ActionItem>(`/api/meetings/${meetingId}/action-items`, { method: "POST", json: body });

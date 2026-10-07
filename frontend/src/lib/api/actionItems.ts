import { apiFetch } from "./client";
import type { ActionItem, ActionItemUpdate, ActionItemWithMeeting } from "./types";

export const listActionItems = (completed?: boolean, signal?: AbortSignal) =>
  apiFetch<ActionItemWithMeeting[]>("/api/action-items", { query: { completed }, signal });

export const updateActionItem = (id: number, body: ActionItemUpdate) =>
  apiFetch<ActionItem>(`/api/action-items/${id}`, { method: "PATCH", json: body });

export const deleteActionItem = (id: number) => apiFetch<void>(`/api/action-items/${id}`, { method: "DELETE" });

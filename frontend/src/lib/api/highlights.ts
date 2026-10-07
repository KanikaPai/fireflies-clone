import { apiFetch } from "./client";
import type { Highlight, HighlightCreate } from "./types";

export const listHighlights = (meetingId: number, signal?: AbortSignal) =>
  apiFetch<Highlight[]>(`/api/meetings/${meetingId}/highlights`, { signal });

export const createHighlight = (meetingId: number, body: HighlightCreate) =>
  apiFetch<Highlight>(`/api/meetings/${meetingId}/highlights`, { method: "POST", json: body });

export const deleteHighlight = (id: number) => apiFetch<void>(`/api/highlights/${id}`, { method: "DELETE" });

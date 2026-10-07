import { apiFetch } from "./client";
import type { MeetingDetail, MeetingListParams, MeetingPage, MeetingUpdate } from "./types";

export const listMeetings = (params: MeetingListParams, signal?: AbortSignal) =>
  apiFetch<MeetingPage>("/api/meetings", { query: params, signal });

export const getMeeting = (id: number, signal?: AbortSignal) =>
  apiFetch<MeetingDetail>(`/api/meetings/${id}`, { signal });

export const updateMeeting = (id: number, body: MeetingUpdate) =>
  apiFetch<MeetingDetail>(`/api/meetings/${id}`, { method: "PATCH", json: body });

export const deleteMeeting = (id: number) => apiFetch<void>(`/api/meetings/${id}`, { method: "DELETE" });

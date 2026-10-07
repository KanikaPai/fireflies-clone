import { apiFetch } from "./client";
import type {
  BulkDeleteResult,
  Insights,
  MeetingDetail,
  MeetingListParams,
  MeetingPage,
  MeetingUpdate,
  ReassignRequest,
  ReassignResult,
  ReplaceRequest,
  ReplaceResult,
  Share,
  Transcript,
} from "./types";

export const listMeetings = (params: MeetingListParams, signal?: AbortSignal) =>
  apiFetch<MeetingPage>("/api/meetings", { query: params, signal });

export const getMeeting = (id: number, signal?: AbortSignal) =>
  apiFetch<MeetingDetail>(`/api/meetings/${id}`, { signal });

export const updateMeeting = (id: number, body: MeetingUpdate) =>
  apiFetch<MeetingDetail>(`/api/meetings/${id}`, { method: "PATCH", json: body });

export const deleteMeeting = (id: number) => apiFetch<void>(`/api/meetings/${id}`, { method: "DELETE" });

export const getTranscript = (id: number, signal?: AbortSignal) =>
  apiFetch<Transcript>(`/api/meetings/${id}/transcript`, { signal });

export const getInsights = (id: number, signal?: AbortSignal) =>
  apiFetch<Insights>(`/api/meetings/${id}/insights`, { signal });

export const regenerateSummary = (id: number) =>
  apiFetch<MeetingDetail>(`/api/meetings/${id}/summary/regenerate`, { method: "POST" });

export const bulkDeleteMeetings = (ids: number[]) =>
  apiFetch<BulkDeleteResult>("/api/meetings/bulk-delete", { method: "POST", json: { ids } });

export const replaceInTranscript = (id: number, body: ReplaceRequest) =>
  apiFetch<ReplaceResult>(`/api/meetings/${id}/transcript/replace`, { method: "POST", json: body });

export const reassignSpeaker = (id: number, body: ReassignRequest) =>
  apiFetch<ReassignResult>(`/api/meetings/${id}/speakers/reassign`, { method: "POST", json: body });

export const listShares = (id: number, signal?: AbortSignal) =>
  apiFetch<Share[]>(`/api/meetings/${id}/shares`, { signal });

export const createShare = (id: number, email: string) =>
  apiFetch<Share>(`/api/meetings/${id}/shares`, { method: "POST", json: { email } });

export const deleteShare = (id: number, shareId: number) =>
  apiFetch<void>(`/api/meetings/${id}/shares/${shareId}`, { method: "DELETE" });

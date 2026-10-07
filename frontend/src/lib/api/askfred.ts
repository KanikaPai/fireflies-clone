import { apiFetch } from "./client";
import type { AskMessage, AskResponse } from "./types";

export const askMeeting = (meetingId: number, question: string, history: AskMessage[]) =>
  apiFetch<AskResponse>(`/api/meetings/${meetingId}/ask`, { method: "POST", json: { question, history } });

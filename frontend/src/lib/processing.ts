import type { MeetingStatus } from "@/lib/api/types";

const POLL_INTERVAL_MS = 2000;
export const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

export type StepState = "done" | "active" | "failed" | "pending";

export interface ProcessingStep {
  key: "uploaded" | "parsed" | "notes";
  label: string;
  state: StepState;
}

/**
 * The three visible steps of processing. A meeting with a transcript has always been uploaded and parsed
 * (that happens before the response), so only the last step is ever active, failed or done.
 */
export function stepsFor(status: MeetingStatus): ProcessingStep[] {
  const notes: StepState = status === "ready" ? "done" : status === "failed" ? "failed" : "active";
  return [
    { key: "uploaded", label: "Uploaded", state: "done" },
    { key: "parsed", label: "Transcript parsed", state: "done" },
    { key: "notes", label: notes === "failed" ? "Generating notes failed" : notes === "done" ? "Notes ready" : "Generating notes…", state: notes },
  ];
}

/** Polling interval for a list query: poll only while at least one meeting is still processing. */
export const pollWhile = (active: boolean): number | false => (active ? POLL_INTERVAL_MS : false);

/** ISO timestamp for "ready in the last 24 hours" (injectable clock for tests). */
export const recentSince = (now: number = Date.now()): string => new Date(now - RECENT_WINDOW_MS).toISOString();

/**
 * Meetings that left the processing list since the previous poll. Returns the ids to look up, so the caller
 * can announce "ready" or "failed". Meetings seen for the first time are never reported.
 */
export function finishedSince(previous: ReadonlyMap<number, string>, current: ReadonlyMap<number, string>): number[] {
  return [...previous.keys()].filter((id) => !current.has(id));
}

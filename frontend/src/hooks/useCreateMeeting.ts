import { useQuery } from "@tanstack/react-query";

import { attachTranscript, createMeeting, retryMeeting } from "@/lib/api/meetings";
import { parseTranscript } from "@/lib/api/transcripts";
import type { MeetingCreate } from "@/lib/api/types";
import { sourceKey, type TranscriptSource } from "@/lib/transcriptSource";

import { invalidate } from "./invalidation";
import { queryKeys } from "./queryKeys";
import { useApiMutation } from "./useApiMutation";

/** Dry-run parse for the create/attach previews. Re-parsing the same input is served from cache. */
export function useParsePreview(source: TranscriptSource | null) {
  return useQuery({
    queryKey: queryKeys.parse(source ? sourceKey(source) : "none"),
    queryFn: ({ signal }) => parseTranscript(source as TranscriptSource, signal),
    enabled: source !== null,
    retry: false,
    staleTime: Infinity,
    gcTime: 60_000,
  });
}

/** Create a meeting (with a pasted/uploaded transcript, or manually without one). No toast: the caller words it. */
export function useCreateMeeting() {
  return useApiMutation({
    mutationFn: (body: MeetingCreate) => createMeeting(body),
    success: null,
    errorFallback: "Could not create the meeting",
    invalidate: (qc) => invalidate.meetingCreated(qc),
  });
}

export function useAttachTranscript(meetingId: number) {
  return useApiMutation({
    mutationFn: (source: TranscriptSource) => attachTranscript(meetingId, source),
    success: "Transcript added. Generating notes…",
    errorFallback: "Could not add the transcript",
    invalidate: (qc) => invalidate.meetingCreated(qc),
  });
}

export function useRetryMeeting() {
  return useApiMutation({
    mutationFn: (meetingId: number) => retryMeeting(meetingId),
    success: "Retrying…",
    errorFallback: "Could not retry processing",
    invalidate: (qc) => invalidate.meetingCreated(qc),
  });
}

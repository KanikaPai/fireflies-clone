import { useQuery } from "@tanstack/react-query";

import { listMeetings } from "@/lib/api/meetings";
import type { MeetingListParams } from "@/lib/api/types";
import { pollWhile, recentSince } from "@/lib/processing";

import { queryKeys } from "./queryKeys";

const BASE = { page_size: 50 } as const;

/** Meetings currently being processed. Polls every 2 s ONLY while the list is non-empty. */
export function useProcessingMeetings() {
  const params: MeetingListParams = { ...BASE, status: "processing" };
  return useQuery({
    queryKey: queryKeys.meetings.list(params),
    queryFn: ({ signal }) => listMeetings(params, signal),
    refetchInterval: (query) => pollWhile((query.state.data?.total ?? 0) > 0),
  });
}

/**
 * The three lists on Meeting Status: processing, failed and recently completed (ready in the last 24 h).
 * Failed and completed refresh at the same pace as processing while anything is still processing, so a
 * meeting moves between sections without a manual reload.
 */
export function useMeetingStatusLists(dateFrom?: string) {
  const processing = useProcessingMeetings();
  const active = (processing.data?.total ?? 0) > 0;
  const extra = dateFrom ? { date_from: dateFrom } : {};

  const failedParams: MeetingListParams = { ...BASE, status: "failed", ...extra };
  const failed = useQuery({
    queryKey: queryKeys.meetings.list(failedParams),
    queryFn: ({ signal }) => listMeetings(failedParams, signal),
    refetchInterval: pollWhile(active),
  });
  const recent = useQuery({
    queryKey: queryKeys.meetings.recent(dateFrom),
    // The 24 h cut-off is read when the request runs (never during render, which would break prerendering).
    queryFn: ({ signal }) => listMeetings({ ...BASE, status: "ready", processed_since: recentSince(), ...extra }, signal),
    refetchInterval: pollWhile(active),
  });
  return { processing, failed, recent };
}

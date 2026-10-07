import { useQuery } from "@tanstack/react-query";

import { getInsights, getMeeting, getTranscript } from "@/lib/api/meetings";
import { pollWhile } from "@/lib/processing";

import { queryKeys } from "./queryKeys";

export const useMeeting = (id: number, enabled = true) =>
  useQuery({
    queryKey: queryKeys.meetings.detail(id),
    queryFn: ({ signal }) => getMeeting(id, signal),
    enabled,
    // While notes are being generated the page keeps itself fresh; polling stops as soon as it is ready or failed.
    refetchInterval: (query) => pollWhile(query.state.data?.status === "processing"),
  });

export const useTranscript = (id: number, enabled = true) =>
  useQuery({ queryKey: queryKeys.meetings.transcript(id), queryFn: ({ signal }) => getTranscript(id, signal), enabled });

export const useInsights = (id: number) =>
  useQuery({ queryKey: queryKeys.meetings.insights(id), queryFn: ({ signal }) => getInsights(id, signal) });

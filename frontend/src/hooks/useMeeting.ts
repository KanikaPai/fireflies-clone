import { useQuery } from "@tanstack/react-query";

import { getInsights, getMeeting, getTranscript } from "@/lib/api/meetings";

import { queryKeys } from "./queryKeys";

export const useMeeting = (id: number) =>
  useQuery({ queryKey: queryKeys.meetings.detail(id), queryFn: ({ signal }) => getMeeting(id, signal) });

export const useTranscript = (id: number) =>
  useQuery({ queryKey: queryKeys.meetings.transcript(id), queryFn: ({ signal }) => getTranscript(id, signal) });

export const useInsights = (id: number) =>
  useQuery({ queryKey: queryKeys.meetings.insights(id), queryFn: ({ signal }) => getInsights(id, signal) });

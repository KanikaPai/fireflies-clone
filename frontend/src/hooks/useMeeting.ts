import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getInsights, getMeeting, getTranscript, regenerateSummary } from "@/lib/api/meetings";
import { notify } from "@/lib/toast";

import { queryKeys } from "./queryKeys";

export const useMeeting = (id: number) =>
  useQuery({ queryKey: queryKeys.meetings.detail(id), queryFn: ({ signal }) => getMeeting(id, signal) });

export const useTranscript = (id: number) =>
  useQuery({ queryKey: queryKeys.meetings.transcript(id), queryFn: ({ signal }) => getTranscript(id, signal) });

export const useInsights = (id: number) =>
  useQuery({ queryKey: queryKeys.meetings.insights(id), queryFn: ({ signal }) => getInsights(id, signal) });

/** Regenerate the summary and chapters, then refresh everything derived from them. */
export function useRegenerateNotes(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => regenerateSummary(id),
    onSuccess: (meeting) => {
      queryClient.setQueryData(queryKeys.meetings.detail(id), meeting);
      void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all });
      notify.success("Notes regenerated");
    },
    onError: (error) => notify.error(error.message || "Could not regenerate notes"),
  });
}

import { useQuery } from "@tanstack/react-query";

import { createHighlight, deleteHighlight, listHighlights } from "@/lib/api/highlights";
import type { Highlight, HighlightCreate } from "@/lib/api/types";

import { queryKeys } from "./queryKeys";
import { useApiMutation } from "./useApiMutation";

/** Highlights and comments of a meeting, in timestamp order. */
export const useHighlights = (meetingId: number) =>
  useQuery({ queryKey: queryKeys.meetings.highlights(meetingId), queryFn: ({ signal }) => listHighlights(meetingId, signal) });

/** Add a highlight or a comment; the list is patched with the server's answer so it appears immediately. */
export function useAddHighlight(meetingId: number) {
  return useApiMutation({
    mutationFn: (body: HighlightCreate) => createHighlight(meetingId, body),
    success: (created) => (created.kind === "comment" ? "Comment added" : "Highlight added"),
    errorFallback: "Could not save that",
    onSuccess: (created, _vars, qc) =>
      qc.setQueryData<Highlight[]>(queryKeys.meetings.highlights(meetingId), (current) => (current ? [...current, created] : [created])),
    invalidate: (qc) => qc.invalidateQueries({ queryKey: queryKeys.meetings.highlights(meetingId) }),
  });
}

export function useDeleteHighlight(meetingId: number) {
  return useApiMutation({
    mutationFn: (highlight: Pick<Highlight, "id" | "kind">) => deleteHighlight(highlight.id),
    success: (_data, highlight) => (highlight.kind === "comment" ? "Comment deleted" : "Highlight removed"),
    errorFallback: "Could not delete that",
    optimistic: async (qc, highlight) => {
      await qc.cancelQueries({ queryKey: queryKeys.meetings.highlights(meetingId) });
      const previous = qc.getQueryData<Highlight[]>(queryKeys.meetings.highlights(meetingId));
      qc.setQueryData<Highlight[]>(queryKeys.meetings.highlights(meetingId), (current) => current?.filter((h) => h.id !== highlight.id));
      return previous;
    },
    rollback: (qc, _vars, previous) => qc.setQueryData(queryKeys.meetings.highlights(meetingId), previous),
    invalidate: (qc) => qc.invalidateQueries({ queryKey: queryKeys.meetings.highlights(meetingId) }),
  });
}

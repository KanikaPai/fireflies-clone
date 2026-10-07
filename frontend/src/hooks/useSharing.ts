import { useQuery } from "@tanstack/react-query";

import { createShare, deleteShare, listShares } from "@/lib/api/meetings";

import { invalidate } from "./invalidation";
import { queryKeys } from "./queryKeys";
import { useApiMutation } from "./useApiMutation";

export const useShares = (meetingId: number, enabled = true) =>
  useQuery({ queryKey: queryKeys.meetings.shares(meetingId), queryFn: ({ signal }) => listShares(meetingId, signal), enabled });

/** Record an invite. No email is sent (auth is mocked); the person simply appears in "Teammates with access". */
export function useInvite(meetingId: number) {
  return useApiMutation({
    mutationFn: (email: string) => createShare(meetingId, email),
    success: (share) => `Invited ${share.email}`,
    errorFallback: "Could not invite that person",
    invalidate: (qc) => invalidate.sharingChanged(qc, meetingId),
  });
}

export function useRemoveShare(meetingId: number) {
  return useApiMutation({
    mutationFn: (shareId: number) => deleteShare(meetingId, shareId),
    success: "Access removed",
    errorFallback: "Could not remove access",
    invalidate: (qc) => invalidate.sharingChanged(qc, meetingId),
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listActionItems, updateActionItem } from "@/lib/api/actionItems";
import type { ActionItemWithMeeting, MeetingDetail } from "@/lib/api/types";
import { notify } from "@/lib/toast";

import { queryKeys } from "./queryKeys";

export const useActionItems = (completed?: boolean) =>
  useQuery({ queryKey: queryKeys.actionItems.list(completed), queryFn: ({ signal }) => listActionItems(completed, signal) });

type ItemPatch = { id: number; completed: boolean };

const withCompletion = <T extends { id: number; is_completed: boolean }>(items: T[], { id, completed }: ItemPatch): T[] =>
  items.map((item) => (item.id === id ? { ...item, is_completed: completed } : item));

/**
 * Toggle completion with an optimistic update applied to every cache that shows the item (the Tasks
 * list and any open meeting detail), rolling back (and toasting) on failure.
 */
export function useToggleActionItem() {
  const queryClient = useQueryClient();
  const listKey = queryKeys.actionItems.list(undefined);
  const detailKey = ["meetings", "detail"] as const;

  return useMutation({
    mutationFn: ({ id, completed }: ItemPatch) => updateActionItem(id, { is_completed: completed }),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.actionItems.all });
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previousList = queryClient.getQueryData<ActionItemWithMeeting[]>(listKey);
      const previousDetails = queryClient.getQueriesData<MeetingDetail>({ queryKey: detailKey });
      queryClient.setQueryData<ActionItemWithMeeting[]>(listKey, (items) => items && withCompletion(items, patch));
      queryClient.setQueriesData<MeetingDetail>({ queryKey: detailKey }, (meeting) =>
        meeting && { ...meeting, action_items: withCompletion(meeting.action_items, patch) },
      );
      return { previousList, previousDetails };
    },
    onError: (error, _patch, context) => {
      queryClient.setQueryData(listKey, context?.previousList);
      context?.previousDetails.forEach(([key, data]) => queryClient.setQueryData(key, data));
      notify.error(error.message || "Could not update the task");
    },
    onSuccess: (_data, { completed }) => notify.success(completed ? "Task marked as complete" : "Task marked as open"),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.actionItems.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all });
    },
  });
}

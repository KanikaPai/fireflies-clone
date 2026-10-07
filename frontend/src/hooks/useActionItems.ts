import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listActionItems, updateActionItem } from "@/lib/api/actionItems";
import type { ActionItemWithMeeting } from "@/lib/api/types";
import { notify } from "@/lib/toast";

import { queryKeys } from "./queryKeys";

export const useActionItems = (completed?: boolean) =>
  useQuery({ queryKey: queryKeys.actionItems.list(completed), queryFn: ({ signal }) => listActionItems(completed, signal) });

/** Toggle completion with an optimistic update, rolling back (and toasting) on failure. */
export function useToggleActionItem() {
  const queryClient = useQueryClient();
  const listKey = queryKeys.actionItems.list(undefined);

  return useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) => updateActionItem(id, { is_completed: completed }),
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.actionItems.all });
      const previous = queryClient.getQueryData<ActionItemWithMeeting[]>(listKey);
      queryClient.setQueryData<ActionItemWithMeeting[]>(listKey, (items) =>
        items?.map((item) => (item.id === id ? { ...item, is_completed: completed } : item)),
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      queryClient.setQueryData(listKey, context?.previous);
      notify.error(error.message || "Could not update the task");
    },
    onSuccess: (_data, { completed }) => notify.success(completed ? "Task marked as complete" : "Task marked as open"),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.actionItems.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all });
    },
  });
}

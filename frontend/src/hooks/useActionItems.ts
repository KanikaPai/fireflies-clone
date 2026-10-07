import { useQuery, type QueryClient } from "@tanstack/react-query";

import { createActionItem, deleteActionItem, listActionItems, updateActionItem } from "@/lib/api/actionItems";
import type { ActionItem, ActionItemCreate, ActionItemUpdate, ActionItemWithMeeting, MeetingDetail, PersonBrief } from "@/lib/api/types";
import { notify } from "@/lib/toast";

import { invalidate } from "./invalidation";
import { queryKeys } from "./queryKeys";
import { useApiMutation } from "./useApiMutation";

export const useActionItems = (completed?: boolean) =>
  useQuery({ queryKey: queryKeys.actionItems.list(completed), queryFn: ({ signal }) => listActionItems(completed, signal) });

// --- optimistic cache helpers ------------------------------------------------------------------------
// An action item is shown in the Tasks list(s) and inside every cached meeting detail; edits are applied to
// both so the UI reacts instantly, and the pre-edit snapshot is restored if the request fails.

const DETAIL_KEY = ["meetings", "detail"] as const;

type Snapshot = {
  lists: [readonly unknown[], ActionItemWithMeeting[] | undefined][];
  details: [readonly unknown[], MeetingDetail | undefined][];
};

/** Apply `fn` to the item with `id` everywhere it is cached; returning null removes it. */
function mapItemInCaches(qc: QueryClient, id: number, fn: (item: ActionItem) => ActionItem | null): Snapshot {
  const snapshot: Snapshot = {
    lists: qc.getQueriesData<ActionItemWithMeeting[]>({ queryKey: queryKeys.actionItems.all }),
    details: qc.getQueriesData<MeetingDetail>({ queryKey: DETAIL_KEY }),
  };
  qc.setQueriesData<ActionItemWithMeeting[]>({ queryKey: queryKeys.actionItems.all }, (items) =>
    items?.flatMap((item) => {
      if (item.id !== id) return [item];
      const next = fn(item);
      return next ? [{ ...item, ...next }] : [];
    }),
  );
  qc.setQueriesData<MeetingDetail>({ queryKey: DETAIL_KEY }, (meeting) =>
    meeting && {
      ...meeting,
      action_items: meeting.action_items.flatMap((item) => {
        if (item.id !== id) return [item];
        const next = fn(item);
        return next ? [next] : [];
      }),
    },
  );
  return snapshot;
}

async function cancelItemQueries(qc: QueryClient): Promise<void> {
  await Promise.all([qc.cancelQueries({ queryKey: queryKeys.actionItems.all }), qc.cancelQueries({ queryKey: DETAIL_KEY })]);
}

function restore(qc: QueryClient, _vars: unknown, snapshot: Snapshot): void {
  snapshot.lists.forEach(([key, data]) => qc.setQueryData(key, data));
  snapshot.details.forEach(([key, data]) => qc.setQueryData(key, data));
}

// --- mutations ---------------------------------------------------------------------------------------

type ItemPatch = { id: number; completed: boolean };

/** Toggle completion; optimistic everywhere the item is shown, rolled back (with a toast) on failure. */
export function useToggleActionItem() {
  return useApiMutation({
    mutationFn: ({ id, completed }: ItemPatch) => updateActionItem(id, { is_completed: completed }),
    success: (_item, { completed }) => (completed ? "Task marked as complete" : "Task marked as open"),
    errorFallback: "Could not update the task",
    optimistic: async (qc, { id, completed }) => {
      await cancelItemQueries(qc);
      return mapItemInCaches(qc, id, (item) => ({ ...item, is_completed: completed }));
    },
    rollback: restore,
    invalidate: (qc) => invalidate.actionItemsChanged(qc),
  });
}

interface ItemEdit {
  id: number;
  changes: ActionItemUpdate;
  /** The new assignee, so the optimistic update can show their name/avatar before the server answers. */
  assignee?: PersonBrief | null;
}

/** Edit text, assignee or due date in place (optimistic, with rollback). */
export function useUpdateActionItem() {
  return useApiMutation({
    mutationFn: ({ id, changes }: ItemEdit) => updateActionItem(id, changes),
    success: "Action item updated",
    errorFallback: "Could not update the action item",
    optimistic: async (qc, { id, changes, assignee }) => {
      await cancelItemQueries(qc);
      return mapItemInCaches(qc, id, (item) => ({
        ...item,
        ...(changes.text !== undefined && changes.text !== null ? { text: changes.text } : {}),
        ...(changes.due_date !== undefined ? { due_date: changes.due_date } : {}),
        ...(assignee !== undefined ? { assignee } : {}),
      }));
    },
    rollback: restore,
    invalidate: (qc) => invalidate.actionItemsChanged(qc),
  });
}

export function useCreateActionItem(meetingId: number) {
  return useApiMutation({
    mutationFn: (body: ActionItemCreate) => createActionItem(meetingId, body),
    success: "Action item added",
    errorFallback: "Could not add the action item",
    invalidate: (qc) => invalidate.actionItemsChanged(qc),
  });
}

/** Fields needed to re-create a deleted item (the Undo action). */
const asCreateBody = (item: ActionItem): ActionItemCreate => ({
  text: item.text,
  assignee_id: item.assignee?.id ?? null,
  source_segment_id: item.source_segment_id,
  is_completed: item.is_completed,
  due_date: item.due_date,
});

/**
 * Delete with an immediate (optimistic) removal and an "Undo" toast. Undo re-creates the item with the same
 * fields; it gets a NEW id (the original row is gone), which is fine because nothing else references it.
 */
export function useDeleteActionItem() {
  return useApiMutation({
    mutationFn: (item: ActionItem) => deleteActionItem(item.id),
    success: null, // the toast below carries the Undo button
    errorFallback: "Could not delete the action item",
    optimistic: async (qc, item) => {
      await cancelItemQueries(qc);
      return mapItemInCaches(qc, item.id, () => null);
    },
    rollback: restore,
    onSuccess: (_data, item, qc) => {
      notify.withAction("Action item deleted", "Undo", () => {
        createActionItem(item.meeting_id, asCreateBody(item))
          .then(() => notify.success("Action item restored"))
          .catch((error: Error) => notify.error(error.message || "Could not restore the action item"))
          .finally(() => void invalidate.actionItemsChanged(qc));
      });
    },
    invalidate: (qc) => invalidate.actionItemsChanged(qc),
  });
}

"use client";

import { ConfirmModal } from "@/components/common/ConfirmModal";
import { pluralize } from "@/components/common/formatters";
import { useDeleteMeetings } from "@/hooks/useMeetingMutations";

export interface DeletableMeeting {
  id: number;
  title: string;
  actionItemCount: number;
}

interface DeleteMeetingsModalProps {
  /** The meetings to delete; the modal is open while this is non-empty. */
  meetings: DeletableMeeting[];
  onOpenChange: (open: boolean) => void;
  /** Called after the API confirmed the deletion. */
  onDeleted?: (ids: number[]) => void;
}

/** Destructive confirmation for one meeting or a bulk selection, naming exactly what will be removed. */
export function DeleteMeetingsModal({ meetings, onOpenChange, onDeleted }: DeleteMeetingsModalProps) {
  const del = useDeleteMeetings();
  if (meetings.length === 0) return null;

  const single = meetings.length === 1;
  const actionItems = meetings.reduce((sum, m) => sum + m.actionItemCount, 0);
  const ids = meetings.map((m) => m.id);

  return (
    <ConfirmModal
      open
      onOpenChange={onOpenChange}
      title={single ? "Delete meeting" : `Delete ${meetings.length} meetings`}
      confirmLabel={single ? "Delete meeting" : `Delete ${meetings.length} meetings`}
      destructive
      pending={del.isPending}
      onConfirm={() =>
        del.mutate(ids, {
          onSuccess: () => {
            onOpenChange(false);
            onDeleted?.(ids);
          },
        })
      }
    >
      {single ? (
        <p>
          Delete <strong className="font-semibold text-text-primary">“{meetings[0].title}”</strong>? This permanently removes its transcript, summary
          and {pluralize(actionItems, "action item")}. This can’t be undone.
        </p>
      ) : (
        <>
          <p>
            This permanently removes {meetings.length} meetings with their transcripts, summaries and {pluralize(actionItems, "action item")}. This can’t be
            undone.
          </p>
          <ul className="mt-2 max-h-28 list-disc space-y-0.5 overflow-y-auto pl-5">
            {meetings.map((m) => (
              <li key={m.id} className="truncate">
                {m.title}
              </li>
            ))}
          </ul>
        </>
      )}
    </ConfirmModal>
  );
}

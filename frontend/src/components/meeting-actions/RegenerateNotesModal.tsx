"use client";

import { ConfirmModal } from "@/components/common/ConfirmModal";
import { useRegenerateNotes } from "@/hooks/useMeetingMutations";

interface RegenerateNotesModalProps {
  meetingId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegenerateNotesModal({ meetingId, open, onOpenChange }: RegenerateNotesModalProps) {
  const regenerate = useRegenerateNotes(meetingId);
  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Regenerate notes?"
      confirmLabel="Regenerate"
      pending={regenerate.isPending}
      onConfirm={() => regenerate.mutate(undefined, { onSuccess: () => onOpenChange(false) })}
    >
      This replaces the current summary, notes and outline with newly generated ones. Action items are kept.
    </ConfirmModal>
  );
}

"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import type { MeetingDetail } from "@/lib/api/types";

import { DeleteMeetingsModal } from "./DeleteMeetingsModal";
import { EditMeetingModal } from "./EditMeetingModal";
import { RegenerateNotesModal } from "./RegenerateNotesModal";
import { RenameMeetingModal } from "./RenameMeetingModal";

type DialogKind = "rename" | "edit" | "delete" | "regenerate";

interface MeetingDialogsValue {
  open: (kind: DialogKind) => void;
}

const MeetingDialogsContext = createContext<MeetingDialogsValue | null>(null);

export function useMeetingDialogs(): MeetingDialogsValue {
  const value = useContext(MeetingDialogsContext);
  if (!value) throw new Error("useMeetingDialogs must be used inside <MeetingDialogsProvider>");
  return value;
}

interface MeetingDialogsProviderProps {
  meeting: MeetingDetail;
  /** Called after the meeting was deleted so the page can leave without refetching it. */
  onDeleted: () => void;
  children: ReactNode;
}

/**
 * Owns the modals that can be opened from several places on the meeting page (⋯ menu, title, details row),
 * so each modal exists once. Consumers call `open("rename" | "edit" | "delete" | "regenerate")`.
 */
export function MeetingDialogsProvider({ meeting, onDeleted, children }: MeetingDialogsProviderProps) {
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const open = useCallback((kind: DialogKind) => setDialog(kind), []);
  const close = (isOpen: boolean) => !isOpen && setDialog(null);
  const value = useMemo(() => ({ open }), [open]);

  return (
    <MeetingDialogsContext.Provider value={value}>
      {children}
      <RenameMeetingModal meeting={dialog === "rename" ? meeting : null} onOpenChange={close} />
      <EditMeetingModal meeting={dialog === "edit" ? meeting : null} onOpenChange={close} />
      <RegenerateNotesModal meetingId={meeting.id} open={dialog === "regenerate"} onOpenChange={close} />
      <DeleteMeetingsModal
        meetings={dialog === "delete" ? [{ id: meeting.id, title: meeting.title, actionItemCount: meeting.action_items.length }] : []}
        onOpenChange={close}
        onDeleted={onDeleted}
      />
    </MeetingDialogsContext.Provider>
  );
}

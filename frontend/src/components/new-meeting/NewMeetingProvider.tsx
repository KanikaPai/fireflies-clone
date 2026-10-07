"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

import { NewMeetingModal, type NewMeetingTab } from "./NewMeetingModal";

interface OpenOptions {
  tab?: NewMeetingTab;
  /** Pre-fill the Upload tab with a file (e.g. dropped on /uploads). */
  file?: File;
}

interface NewMeetingValue {
  open: (options?: OpenOptions) => void;
}

const NewMeetingContext = createContext<NewMeetingValue | null>(null);

export function useNewMeeting(): NewMeetingValue {
  const value = useContext(NewMeetingContext);
  if (!value) throw new Error("useNewMeeting must be used inside <NewMeetingProvider>");
  return value;
}

/** One "New meeting" modal for the whole app shell; Capture menu, /uploads, Home and the library all open it. */
export function NewMeetingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; tab: NewMeetingTab; file: File | null }>({ open: false, tab: "upload", file: null });
  const opener = useRef<HTMLElement | null>(null);

  const open = useCallback((options: OpenOptions = {}) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setState({ open: true, tab: options.tab ?? "upload", file: options.file ?? null });
  }, []);
  const value = useMemo(() => ({ open }), [open]);

  return (
    <NewMeetingContext.Provider value={value}>
      {children}
      <NewMeetingModal
        open={state.open}
        tab={state.tab}
        initialFile={state.file}
        onOpenChange={(isOpen) => {
          if (isOpen) return;
          setState((current) => ({ ...current, open: false }));
          const target = opener.current;
          requestAnimationFrame(() => target?.isConnected && target.focus());
        }}
      />
    </NewMeetingContext.Provider>
  );
}

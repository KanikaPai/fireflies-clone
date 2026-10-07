"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { usePlayerActions } from "@/components/player/hooks";

interface SyncValue {
  /** Whether the transcript is following playback. */
  synced: boolean;
  setSynced: (synced: boolean) => void;
}

const SyncContext = createContext<SyncValue | null>(null);

export function TranscriptSyncProvider({ children }: { children: ReactNode }) {
  const [synced, setSynced] = useState(true);
  const value = useMemo(() => ({ synced, setSynced }), [synced]);
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useTranscriptSync(): SyncValue {
  const value = useContext(SyncContext);
  if (!value) throw new Error("useTranscriptSync must be used inside <TranscriptSyncProvider>");
  return value;
}

/** Seek the player from anywhere in the page and make the transcript follow along again. */
export function useSeekTo(): (ms: number) => void {
  const actions = usePlayerActions();
  const { setSynced } = useTranscriptSync();
  return useCallback(
    (ms: number) => {
      actions.seek(ms);
      setSynced(true);
    },
    [actions, setSynced],
  );
}

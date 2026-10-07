import { useCallback, useEffect, useRef, useState } from "react";

import type { UserSettings, UserSettingsUpdate } from "@/lib/api/types";
import { dropSaved, mergeSettings } from "@/lib/settings";

import { useSettings, useUpdateSettings } from "./useSettings";

const SAVE_DELAY_MS = 600;

/**
 * Settings with debounced autosave. `settings` shows the server state with unsaved edits laid on top, so
 * controls respond instantly; edits are batched into one PATCH after a short pause, then a "Settings saved"
 * toast confirms. Pending edits are flushed if the component unmounts. Used by the Settings page AND the Home
 * notetaker card, which share one cache entry and therefore stay in sync.
 */
export function useAutosaveSettings(): { settings: UserSettings | undefined; change: (changes: UserSettingsUpdate) => void; query: ReturnType<typeof useSettings> } {
  const query = useSettings();
  const save = useUpdateSettings();
  const [draft, setDraft] = useState<UserSettingsUpdate>({});
  const pending = useRef<UserSettingsUpdate>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { mutate } = save;

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const changes = pending.current;
    pending.current = {};
    if (Object.keys(changes).length === 0) return;
    mutate(changes, { onSettled: () => setDraft((current) => dropSaved(current, changes)) });
  }, [mutate]);

  const change = useCallback(
    (changes: UserSettingsUpdate) => {
      pending.current = { ...pending.current, ...changes };
      setDraft((current) => ({ ...current, ...changes }));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush],
  );

  useEffect(() => flush, [flush]); // flush on unmount

  return { settings: query.data ? mergeSettings(query.data, draft) : undefined, change, query };
}

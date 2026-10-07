import { useQuery } from "@tanstack/react-query";

import { getSettings, updateMe, updateSettings } from "@/lib/api/users";
import type { UserSettings, UserSettingsUpdate, UserUpdate } from "@/lib/api/types";
import { mergeSettings } from "@/lib/settings";

import { queryKeys } from "./queryKeys";
import { useApiMutation } from "./useApiMutation";

export const useSettings = () => useQuery({ queryKey: queryKeys.settings, queryFn: ({ signal }) => getSettings(signal) });

/**
 * Save settings. The cache is updated optimistically so every consumer (Settings page, Home notetaker card)
 * reflects a change immediately and stays in sync; it is rolled back if the request fails.
 */
export function useUpdateSettings(options: { toast?: boolean } = { toast: true }) {
  return useApiMutation({
    mutationFn: (changes: UserSettingsUpdate) => updateSettings(changes),
    success: options.toast === false ? null : "Settings saved",
    errorFallback: "Could not save your settings",
    optimistic: async (qc, changes) => {
      await qc.cancelQueries({ queryKey: queryKeys.settings });
      const previous = qc.getQueryData<UserSettings>(queryKeys.settings);
      qc.setQueryData<UserSettings>(queryKeys.settings, (current) => current && mergeSettings(current, changes));
      return previous;
    },
    rollback: (qc, _changes, previous) => qc.setQueryData(queryKeys.settings, previous),
    onSuccess: (settings, _changes, qc) => qc.setQueryData(queryKeys.settings, settings),
  });
}

export function useUpdateProfile() {
  return useApiMutation({
    mutationFn: (changes: UserUpdate) => updateMe(changes),
    success: "Profile updated",
    errorFallback: "Could not update your profile",
    onSuccess: (user, _changes, qc) => qc.setQueryData(queryKeys.me, user),
  });
}

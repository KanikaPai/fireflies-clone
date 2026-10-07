import type { AutoJoin, RecapRecipients, UserSettings, UserSettingsUpdate } from "@/lib/api/types";

/** Apply a partial update to settings, ignoring undefined and null (the API never accepts null). */
export function mergeSettings(current: UserSettings, changes: UserSettingsUpdate): UserSettings {
  const next: Record<string, unknown> = { ...current };
  for (const [key, value] of Object.entries(changes)) if (value !== undefined && value !== null) next[key] = value;
  return next as unknown as UserSettings;
}

export const AUTO_JOIN_LABELS: Record<AutoJoin, string> = {
  all: "All meetings with web-conf link",
  owned: "Only meetings that I own",
  teammates: "Only meetings with teammates",
  invited: "Only when I invite fred@fireflies.ai",
};

export const RECAP_LABELS: Record<RecapRecipients, string> = {
  everyone: "Everyone on the invite",
  team: "Only me and participants from my Fireflies team",
  me: "Only me",
};

export const LANGUAGES = [
  "English (Global)",
  "English (US)",
  "English (UK)",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Hindi",
  "Japanese",
] as const;

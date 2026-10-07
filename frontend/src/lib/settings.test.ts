import { describe, expect, it } from "vitest";

import type { UserSettings } from "@/lib/api/types";

import { AUTO_JOIN_LABELS, RECAP_LABELS, mergeSettings } from "./settings";

const base: UserSettings = {
  default_privacy: "link",
  auto_join: "all",
  recap_recipients: "everyone",
  language: "English (Global)",
  email_notes_enabled: true,
  notify_on_ready: true,
  theme: "system",
};

describe("mergeSettings", () => {
  it("applies only the provided fields", () => {
    expect(mergeSettings(base, { auto_join: "owned" })).toEqual({ ...base, auto_join: "owned" });
  });
  it("ignores undefined and null, and keeps false values", () => {
    expect(mergeSettings(base, { theme: null, language: undefined })).toEqual(base);
    expect(mergeSettings(base, { email_notes_enabled: false }).email_notes_enabled).toBe(false);
  });
  it("does not mutate its input", () => {
    mergeSettings(base, { theme: "dark" });
    expect(base.theme).toBe("system");
  });
});

describe("labels", () => {
  it("uses the wording from the product", () => {
    expect(Object.values(AUTO_JOIN_LABELS)).toEqual([
      "All meetings with web-conf link",
      "Only meetings that I own",
      "Only meetings with teammates",
      "Only when I invite fred@fireflies.ai",
    ]);
    expect(RECAP_LABELS.team).toBe("Only me and participants from my Fireflies team");
  });
});

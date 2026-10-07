import { describe, expect, it } from "vitest";

import { PRIVACY_OPTIONS, SETTINGS_PRIVACY_LEVELS, SHARE_PRIVACY_LEVELS } from "./privacy";

describe("privacy levels", () => {
  it("offers five levels in the Share modal and all six in Settings", () => {
    expect(SHARE_PRIVACY_LEVELS).toEqual(["link", "teammates_participants", "teammates", "participants", "owner"]);
    expect(SETTINGS_PRIVACY_LEVELS).toHaveLength(6);
    expect(Object.keys(PRIVACY_OPTIONS).sort()).toEqual([...SETTINGS_PRIVACY_LEVELS].sort());
  });
  it("uses the Share modal wording for the first option", () => {
    expect(PRIVACY_OPTIONS.link.shareLabel).toBe("Teammates & Anyone with Link");
    expect(PRIVACY_OPTIONS.owner.shareLabel).toBe("Only Owner");
  });
});

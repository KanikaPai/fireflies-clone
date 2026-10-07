import { describe, expect, it } from "vitest";

import { isTheme, resolvesToDark } from "./theme";

describe("theme", () => {
  it("resolves system to the OS preference", () => {
    expect(resolvesToDark("system", true)).toBe(true);
    expect(resolvesToDark("system", false)).toBe(false);
    expect(resolvesToDark("dark", false)).toBe(true);
    expect(resolvesToDark("light", true)).toBe(false);
  });
  it("validates theme values", () => {
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("blue")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { trimRange } from "./selection";

describe("trimRange", () => {
  it("drops leading and trailing whitespace from a selection", () => {
    expect(trimRange("Hello big world", 5, 15)).toEqual({ start: 6, end: 15 });
    expect(trimRange("Hello big world", 0, 6)).toEqual({ start: 0, end: 5 });
  });
  it("returns null for whitespace-only selections", () => {
    expect(trimRange("a   b", 1, 4)).toBeNull();
  });
});

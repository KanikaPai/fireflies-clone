import { describe, expect, it } from "vitest";

import { findActiveIndex } from "./activeSegment";

const starts = [3_000, 10_000, 10_500, 20_000, 45_000];

describe("findActiveIndex", () => {
  it("returns -1 before the first segment and for an empty list", () => {
    expect(findActiveIndex(starts, 0)).toBe(-1);
    expect(findActiveIndex(starts, 2_999)).toBe(-1);
    expect(findActiveIndex([], 5_000)).toBe(-1);
  });
  it("finds the segment containing the time", () => {
    expect(findActiveIndex(starts, 3_000)).toBe(0); // exact start
    expect(findActiveIndex(starts, 9_999)).toBe(0);
    expect(findActiveIndex(starts, 10_000)).toBe(1);
    expect(findActiveIndex(starts, 10_499)).toBe(1);
    expect(findActiveIndex(starts, 10_500)).toBe(2);
    expect(findActiveIndex(starts, 30_000)).toBe(3);
  });
  it("keeps the last segment active to the end", () => {
    expect(findActiveIndex(starts, 45_000)).toBe(4);
    expect(findActiveIndex(starts, 9_999_999)).toBe(4);
  });
  it("matches a linear scan for every time in range", () => {
    for (let t = 0; t <= 50_000; t += 137) {
      let expected = -1;
      starts.forEach((s, i) => {
        if (s <= t) expected = i;
      });
      expect(findActiveIndex(starts, t)).toBe(expected);
    }
  });
  it("handles a single segment", () => {
    expect(findActiveIndex([500], 499)).toBe(-1);
    expect(findActiveIndex([500], 500)).toBe(0);
  });
});

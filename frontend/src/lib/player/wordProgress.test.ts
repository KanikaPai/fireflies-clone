import { describe, expect, it } from "vitest";

import { spokenCharOffset, spokenWordCount, wordSpans } from "./wordProgress";

describe("wordSpans", () => {
  it("returns character spans of each word", () => {
    expect(wordSpans("Hi there,  you")).toEqual([
      { start: 0, end: 2 },
      { start: 3, end: 9 },
      { start: 11, end: 14 },
    ]);
  });
  it("handles empty and whitespace-only text", () => {
    expect(wordSpans("")).toEqual([]);
    expect(wordSpans("   ")).toEqual([]);
  });
});

describe("spokenWordCount", () => {
  const spans = wordSpans("one two three four");

  it("is 0 before the segment and all words after it", () => {
    expect(spokenWordCount(spans, 1_000, 5_000, 0)).toBe(0);
    expect(spokenWordCount(spans, 1_000, 5_000, 1_000)).toBe(0);
    expect(spokenWordCount(spans, 1_000, 5_000, 5_000)).toBe(4);
    expect(spokenWordCount(spans, 1_000, 5_000, 99_000)).toBe(4);
  });
  it("increases monotonically through the segment", () => {
    let previous = 0;
    for (let t = 1_000; t <= 5_000; t += 50) {
      const count = spokenWordCount(spans, 1_000, 5_000, t);
      expect(count).toBeGreaterThanOrEqual(previous);
      previous = count;
    }
    expect(previous).toBe(4);
  });
  it("is about half-way at the midpoint", () => {
    const equal = wordSpans("aaaa bbbb cccc dddd"); // equal word lengths
    expect(spokenWordCount(equal, 0, 4_000, 2_000)).toBe(2);
    expect(spokenWordCount(equal, 0, 4_000, 1_000)).toBe(1);
  });
  it("weights longer words as taking longer", () => {
    const uneven = wordSpans("a extraordinarily b"); // the long middle word dominates
    expect(spokenWordCount(uneven, 0, 1_000, 100)).toBe(1); // "a" done quickly
    expect(spokenWordCount(uneven, 0, 1_000, 500)).toBe(1); // still saying the long word
  });
  it("handles empty text and zero-length segments", () => {
    expect(spokenWordCount([], 0, 1_000, 500)).toBe(0);
    expect(spokenWordCount(spans, 2_000, 2_000, 2_001)).toBe(4);
  });
});

describe("spokenCharOffset", () => {
  const spans = wordSpans("one two three");
  it("returns the end of the last spoken word", () => {
    expect(spokenCharOffset(spans, 0)).toBe(0);
    expect(spokenCharOffset(spans, 1)).toBe(3);
    expect(spokenCharOffset(spans, 2)).toBe(7);
    expect(spokenCharOffset(spans, 3)).toBe(13);
    expect(spokenCharOffset(spans, 99)).toBe(13);
  });
});

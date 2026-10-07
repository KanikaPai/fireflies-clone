import { describe, expect, it } from "vitest";

import { buildSlices } from "./textSlices";

describe("buildSlices", () => {
  it("returns one plain slice when nothing is highlighted", () => {
    expect(buildSlices("hello world", [], 0)).toEqual([{ text: "hello world", spoken: false, match: -1 }]);
  });
  it("splits at the spoken boundary", () => {
    expect(buildSlices("hello world", [], 5)).toEqual([
      { text: "hello", spoken: true, match: -1 },
      { text: " world", spoken: false, match: -1 },
    ]);
  });
  it("marks matches", () => {
    const slices = buildSlices("the cat and the hat", [{ start: 4, end: 7 }, { start: 16, end: 19 }], 0);
    expect(slices.map((s) => [s.text, s.match])).toEqual([
      ["the ", -1],
      ["cat", 0],
      [" and the ", -1],
      ["hat", 1],
    ]);
  });
  it("combines spoken and match boundaries, even when a match straddles the spoken edge", () => {
    const slices = buildSlices("abcdefghij", [{ start: 2, end: 8 }], 5);
    expect(slices.map((s) => [s.text, s.spoken, s.match])).toEqual([
      ["ab", true, -1],
      ["cde", true, 0],
      ["fgh", false, 0],
      ["ij", false, -1],
    ]);
    expect(slices.map((s) => s.text).join("")).toBe("abcdefghij");
  });
  it("is lossless for fully spoken text and empty text", () => {
    expect(buildSlices("done", [], 4)).toEqual([{ text: "done", spoken: true, match: -1 }]);
    expect(buildSlices("", [], 0)).toEqual([]);
  });
});

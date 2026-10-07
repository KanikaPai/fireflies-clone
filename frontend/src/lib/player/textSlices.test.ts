import { describe, expect, it } from "vitest";

import { buildSlices } from "./textSlices";

describe("buildSlices", () => {
  it("returns one plain slice when nothing is highlighted", () => {
    expect(buildSlices("hello world", [], 0)).toEqual([{ text: "hello world", spoken: false, match: -1, highlightIds: [], commentIds: [] }]);
  });
  it("splits at the spoken boundary", () => {
    expect(buildSlices("hello world", [], 5)).toEqual([
      { text: "hello", spoken: true, match: -1, highlightIds: [], commentIds: [] },
      { text: " world", spoken: false, match: -1, highlightIds: [], commentIds: [] },
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
    expect(buildSlices("done", [], 4)).toEqual([{ text: "done", spoken: true, match: -1, highlightIds: [], commentIds: [] }]);
    expect(buildSlices("", [], 0)).toEqual([]);
  });
});

describe("buildSlices with highlight and comment marks", () => {
  const text = "Alpha beta gamma delta";

  it("cuts at mark boundaries and reports the covering ids", () => {
    const slices = buildSlices(text, [], 0, [
      { id: 1, kind: "highlight", start: 6, end: 10 },
      { id: 2, kind: "comment", start: 6, end: 16 },
    ]);
    expect(slices.map((s) => s.text)).toEqual(["Alpha ", "beta", " gamma", " delta"]);
    expect(slices[1]).toMatchObject({ highlightIds: [1], commentIds: [2] });
    expect(slices[2]).toMatchObject({ highlightIds: [], commentIds: [2] });
    expect(slices[0]).toMatchObject({ highlightIds: [], commentIds: [] });
  });

  it("layers marks over search matches and the spoken boundary without losing text", () => {
    const slices = buildSlices(text, [{ start: 6, end: 10 }], 8, [{ id: 7, kind: "highlight", start: 0, end: 12 }]);
    expect(slices.map((s) => s.text).join("")).toBe(text);
    const beta = slices.filter((s) => s.match === 0);
    expect(beta.every((s) => s.highlightIds.includes(7))).toBe(true);
    expect(slices.find((s) => s.text === "be")?.spoken).toBe(true);
  });

  it("is unchanged when there are no marks", () => {
    expect(buildSlices(text, [], 0)).toHaveLength(1);
  });
});

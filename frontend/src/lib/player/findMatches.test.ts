import { describe, expect, it } from "vitest";

import { escapeRegExp, findMatches, replaceRange, stepIndex } from "./findMatches";

describe("findMatches", () => {
  const texts = ["The pricing plan", "No match here", "Pricing, pricing and PRICING"];

  it("finds every occurrence case-insensitively, in order", () => {
    const matches = findMatches(texts, "pricing");
    expect(matches).toHaveLength(4);
    expect(matches.map((m) => m.index)).toEqual([0, 2, 2, 2]);
    expect(texts[0].slice(matches[0].start, matches[0].end)).toBe("pricing");
    expect(texts[2].slice(matches[3].start, matches[3].end)).toBe("PRICING");
  });
  it("returns nothing for empty or whitespace queries", () => {
    expect(findMatches(texts, "")).toEqual([]);
    expect(findMatches(texts, "   ")).toEqual([]);
  });
  it("treats regex characters literally", () => {
    expect(findMatches(["cost (USD) $5.00?", "cost USD"], "(USD)")).toEqual([{ index: 0, start: 5, end: 10 }]);
    expect(findMatches(["a.b", "axb"], "a.b")).toHaveLength(1);
    expect(findMatches(["what?"], "?")).toHaveLength(1);
    expect(() => findMatches(["x"], "[unclosed")).not.toThrow();
    expect(() => findMatches(["x"], "\\")).not.toThrow();
  });
  it("does not report overlapping matches", () => {
    expect(findMatches(["aaaa"], "aa")).toHaveLength(2);
  });
  it("trims the query but keeps inner spaces", () => {
    expect(findMatches(["feature flag now"], "  feature flag ")).toHaveLength(1);
  });
});

describe("escapeRegExp", () => {
  it("escapes special characters", () => expect(escapeRegExp("a.b*c")).toBe("a\\.b\\*c"));
});

describe("stepIndex", () => {
  it("wraps around in both directions", () => {
    expect(stepIndex(0, 1, 3)).toBe(1);
    expect(stepIndex(2, 1, 3)).toBe(0);
    expect(stepIndex(0, -1, 3)).toBe(2);
    expect(stepIndex(0, 1, 0)).toBe(0);
  });
});

describe("replaceRange", () => {
  it("replaces exactly the matched range and keeps the rest", () => {
    const text = "Q3 plan and Q3 budget";
    const [first, second] = findMatches([text], "q3");
    expect(replaceRange(text, second.start, second.end, "Q4")).toBe("Q3 plan and Q4 budget");
    expect(replaceRange(text, first.start, first.end, "")).toBe(" plan and Q3 budget");
  });
  it("inserts the replacement literally (no special replacement patterns)", () => {
    expect(replaceRange("price", 0, 5, "$& $1")).toBe("$& $1");
  });
});

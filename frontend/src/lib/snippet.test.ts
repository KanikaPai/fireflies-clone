import { describe, expect, it } from "vitest";

import { meetingSearchHref, parseSnippet, termFromSnippet } from "./snippet";

describe("parseSnippet", () => {
  it("splits marks from text and decodes escapes", () => {
    expect(parseSnippet("a &lt;b&gt; <mark>run</mark>way &amp; co")).toEqual([
      { text: "a <b> ", mark: false },
      { text: "run", mark: true },
      { text: "way & co", mark: false },
    ]);
  });
  it("never produces markup: escaped tags stay plain text", () => {
    const parts = parseSnippet("&lt;script&gt;alert(1)&lt;/script&gt; <mark>x</mark>");
    expect(parts.every((p) => !p.mark || p.text === "x")).toBe(true);
    expect(parts[0].text).toBe("<script>alert(1)</script> ");
  });
  it("handles snippets without marks", () => {
    expect(parseSnippet("plain")).toEqual([{ text: "plain", mark: false }]);
    expect(parseSnippet("")).toEqual([]);
  });
});

describe("links", () => {
  it("uses the first marked word as the Find term", () => {
    expect(termFromSnippet("the <mark>runway</mark> and <mark>cash</mark>", "x")).toBe("runway");
    expect(termFromSnippet("nothing marked", "fallback")).toBe("fallback");
  });
  it("builds a meeting deep link", () => {
    expect(meetingSearchHref(3, 125_900, "runway")).toBe("/meetings/3?t=126&q=runway");
    expect(meetingSearchHref(3, null)).toBe("/meetings/3");
    expect(meetingSearchHref(3, 0, "a b")).toBe("/meetings/3?t=0&q=a+b");
  });
});

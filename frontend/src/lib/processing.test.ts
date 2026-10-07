import { describe, expect, it } from "vitest";

import { RECENT_WINDOW_MS, finishedSince, pollWhile, recentSince, stepsFor } from "./processing";

describe("stepsFor", () => {
  it("shows the last step active while processing", () => {
    expect(stepsFor("processing").map((s) => s.state)).toEqual(["done", "done", "active"]);
    expect(stepsFor("processing")[2].label).toBe("Generating notes…");
  });
  it("shows it done when ready and failed when failed", () => {
    expect(stepsFor("ready").map((s) => s.state)).toEqual(["done", "done", "done"]);
    expect(stepsFor("failed").map((s) => s.state)).toEqual(["done", "done", "failed"]);
  });
});

describe("polling helpers", () => {
  it("polls only while something is processing", () => {
    expect(pollWhile(true)).toBe(2000);
    expect(pollWhile(false)).toBe(false);
  });
  it("computes the 24h window", () => {
    expect(Date.parse(recentSince(RECENT_WINDOW_MS + 5_000))).toBe(5_000);
  });
  it("reports only meetings that disappeared from the processing list", () => {
    const before = new Map([[1, "A"], [2, "B"], [3, "C"]]);
    expect(finishedSince(before, new Map([[2, "B"]]))).toEqual([1, 3]);
    expect(finishedSince(new Map(), new Map([[9, "new"]]))).toEqual([]); // first sighting is not a completion
    expect(finishedSince(before, before)).toEqual([]);
  });
});

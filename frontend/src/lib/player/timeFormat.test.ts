import { describe, expect, it } from "vitest";

import { formatClock, formatClockPair, parseTimeParam } from "./timeFormat";

describe("formatClock", () => {
  it("formats minutes and seconds", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(5_000)).toBe("00:05");
    expect(formatClock(125_000)).toBe("02:05");
    expect(formatClock(59_999)).toBe("00:59"); // truncates, never rounds up
  });
  it("adds hours from one hour up", () => {
    expect(formatClock(3_600_000)).toBe("1:00:00");
    expect(formatClock(3_725_000)).toBe("1:02:05");
  });
  it("clamps negatives", () => expect(formatClock(-500)).toBe("00:00"));
  it("formats the player pair", () => expect(formatClockPair(12_000, 1_122_000)).toBe("00:12 / 18:42"));
});

describe("parseTimeParam", () => {
  it("parses seconds", () => {
    expect(parseTimeParam("120")).toBe(120_000);
    expect(parseTimeParam("90.5")).toBe(90_500);
    expect(parseTimeParam("0")).toBe(0);
  });
  it("parses clock strings", () => {
    expect(parseTimeParam("2:00")).toBe(120_000);
    expect(parseTimeParam("1:02:05")).toBe(3_725_000);
  });
  it("rejects invalid input", () => {
    for (const bad of [null, undefined, "", "abc", "-5", "1:75", "1:2:3:4", "12s"]) expect(parseTimeParam(bad)).toBeNull();
  });
});

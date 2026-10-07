import { describe, expect, it } from "vitest";

import { isValidEmail, localDateTimeToIso, validateTitle } from "./validation";

describe("validateTitle", () => {
  it("rejects empty and whitespace-only titles", () => {
    expect(validateTitle("")).toMatch(/empty/);
    expect(validateTitle("   ")).toMatch(/empty/);
  });
  it("rejects titles over 255 characters", () => {
    expect(validateTitle("a".repeat(256))).toMatch(/255/);
    expect(validateTitle("a".repeat(255))).toBeNull();
  });
  it("accepts normal titles", () => expect(validateTitle("  Weekly sync ")).toBeNull());
});

describe("isValidEmail", () => {
  it.each(["a@b.co", " ada@example.com "])("accepts %s", (value) => expect(isValidEmail(value)).toBe(true));
  it.each(["", "ada", "ada@", "@b.co", "a b@c.de", "a@b"])("rejects %j", (value) => expect(isValidEmail(value)).toBe(false));
});

describe("localDateTimeToIso", () => {
  it("builds a UTC ISO string from local date and time", () => {
    const iso = localDateTimeToIso("2026-10-07", "14:30");
    expect(iso && new Date(iso).getHours()).toBe(14);
    expect(iso && new Date(iso).getMinutes()).toBe(30);
  });
  it("defaults the time and rejects a missing or invalid date", () => {
    expect(localDateTimeToIso("2026-10-07", "")).not.toBeNull();
    expect(localDateTimeToIso("", "10:00")).toBeNull();
    expect(localDateTimeToIso("not-a-date", "10:00")).toBeNull();
  });
});

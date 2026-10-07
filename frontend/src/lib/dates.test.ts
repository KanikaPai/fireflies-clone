import { describe, expect, it } from "vitest";

import { formatDueDate, isOverdue, toDateString } from "./dates";

const NOW = new Date(2026, 9, 7, 15, 30); // Oct 7 2026, 3:30 PM local

describe("isOverdue", () => {
  it("is overdue only after the due day has passed", () => {
    expect(isOverdue("2026-10-06", false, NOW)).toBe(true);
    expect(isOverdue("2026-10-07", false, NOW)).toBe(false); // due today is not overdue
    expect(isOverdue("2026-10-08", false, NOW)).toBe(false);
  });
  it("never flags completed items or items without a date", () => {
    expect(isOverdue("2020-01-01", true, NOW)).toBe(false);
    expect(isOverdue(null, false, NOW)).toBe(false);
  });
});

describe("date helpers", () => {
  it("formats a due date without timezone shifts", () => expect(formatDueDate("2026-10-07")).toBe("Oct 7"));
  it("serialises a local date", () => expect(toDateString(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05"));
});

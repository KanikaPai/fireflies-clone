import { describe, expect, it } from "vitest";

import type { ActionItemWithMeeting, MeetingListItem } from "@/lib/api/types";

import { buildNotifications, hasUnread } from "./notifications";

const NOW = new Date(2026, 9, 7, 12, 0); // Oct 7 2026, noon local

const meeting = (id: number, title: string, processed_at: string | null, error_message: string | null = null) =>
  ({ id, title, processed_at, error_message }) as MeetingListItem;
const item = (id: number, due: string | null, completed = false) =>
  ({ id, text: `Task ${id}`, due_date: due, is_completed: completed, meeting_id: 5, meeting_title: "Sync" }) as ActionItemWithMeeting;

describe("buildNotifications", () => {
  it("derives ready, failed and overdue notifications, newest first", () => {
    const list = buildNotifications(
      {
        ready: [meeting(1, "Kickoff", "2026-10-07T10:00:00Z")],
        failed: [meeting(2, "Standup", "2026-10-07T11:00:00Z", "boom")],
        actionItems: [item(9, "2026-10-01")],
      },
      NOW,
    );
    expect(list.map((n) => n.kind)).toEqual(["failed", "ready", "overdue"]);
    expect(list[0]).toMatchObject({ title: "Standup couldn't be processed", body: "boom", href: "/meeting-status" });
    expect(list[1]).toMatchObject({ title: "Kickoff is ready", href: "/meetings/1" });
    expect(list[2]).toMatchObject({ title: "Action item overdue", href: "/meetings/5" });
  });

  it("ignores completed, undated and not-yet-overdue items", () => {
    const list = buildNotifications(
      { ready: [], failed: [], actionItems: [item(1, "2026-10-01", true), item(2, null), item(3, "2026-10-07"), item(4, "2026-10-20")] },
      NOW,
    );
    expect(list).toEqual([]);
  });

  it("returns nothing when there is nothing to report", () => {
    expect(buildNotifications({ ready: [], failed: [], actionItems: [] }, NOW)).toEqual([]);
  });
});

describe("hasUnread", () => {
  const list = buildNotifications({ ready: [meeting(1, "A", "2026-10-07T10:00:00Z")], failed: [], actionItems: [] }, NOW);
  it("is false with no notifications, whatever was opened", () => {
    expect(hasUnread([], null)).toBe(false);
  });
  it("is true when never opened", () => expect(hasUnread(list, null)).toBe(true));
  it("is true only for things newer than the last time it was opened", () => {
    expect(hasUnread(list, Date.parse("2026-10-07T09:00:00Z"))).toBe(true);
    expect(hasUnread(list, Date.parse("2026-10-07T10:30:00Z"))).toBe(false);
  });
});

import { addDays, parseISO, startOfDay } from "date-fns";

import type { ActionItemWithMeeting, MeetingListItem } from "@/lib/api/types";
import { isOverdue } from "@/lib/dates";

export interface AppNotification {
  id: string;
  kind: "ready" | "failed" | "overdue";
  title: string;
  body: string;
  /** When it happened (ms since epoch); drives sorting and the unread dot. */
  at: number;
  href: string;
}

interface Sources {
  ready: readonly MeetingListItem[];
  failed: readonly MeetingListItem[];
  actionItems: readonly ActionItemWithMeeting[];
}

/**
 * Notifications are derived from real data, never stored: meetings that became ready in the last 24 h, failed
 * meetings, and overdue open action items. Newest first.
 */
export function buildNotifications({ ready, failed, actionItems }: Sources, now: Date = new Date()): AppNotification[] {
  const list: AppNotification[] = [];
  for (const meeting of ready) {
    list.push({
      id: `ready-${meeting.id}`,
      kind: "ready",
      title: `${meeting.title} is ready`,
      body: "Your summary and action items are available.",
      at: meeting.processed_at ? Date.parse(meeting.processed_at) : 0,
      href: `/meetings/${meeting.id}`,
    });
  }
  for (const meeting of failed) {
    list.push({
      id: `failed-${meeting.id}`,
      kind: "failed",
      title: `${meeting.title} couldn't be processed`,
      body: meeting.error_message ?? "Open Meeting Status to retry.",
      at: meeting.processed_at ? Date.parse(meeting.processed_at) : 0,
      href: "/meeting-status",
    });
  }
  for (const item of actionItems) {
    if (!item.due_date || !isOverdue(item.due_date, item.is_completed, now)) continue;
    list.push({
      id: `overdue-${item.id}`,
      kind: "overdue",
      title: "Action item overdue",
      body: `“${item.text}” in ${item.meeting_title}`,
      at: startOfDay(addDays(parseISO(item.due_date), 1)).getTime(), // the moment it became overdue
      href: `/meetings/${item.meeting_id}`,
    });
  }
  return list.sort((a, b) => b.at - a.at);
}

/** Unread = something happened after the popover was last opened (never opened = everything is new). */
export const hasUnread = (notifications: readonly AppNotification[], lastOpened: number | null): boolean =>
  notifications.some((n) => lastOpened === null || n.at > lastOpened);

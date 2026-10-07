import { endOfWeek, format, isSameYear, startOfWeek } from "date-fns";

/** 1860 -> "31 mins" (always minutes, like Fireflies: "64 mins"). */
export function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} ${minutes === 1 ? "min" : "mins"}`;
}

/** "Tue, Nov 04 2025" */
export const formatDate = (value: string | Date): string => format(new Date(value), "EEE, MMM dd yyyy");

/** "05:23 PM" */
export const formatTime = (value: string | Date): string => format(new Date(value), "hh:mm a");

/** "Tue, Nov 04 · 5:23 PM" (feed cards) */
export const formatDateTime = (value: string | Date): string => format(new Date(value), "EEE, MMM d · h:mm a");

const WEEK_OPTIONS = { weekStartsOn: 0 } as const; // Sunday-Saturday weeks, as in Fireflies

/** Stable key for the week containing `value`. */
export const weekKey = (value: string | Date): string => format(startOfWeek(new Date(value), WEEK_OPTIONS), "yyyy-MM-dd");

/** "Dec 7 - Dec 13, 2025" (or "Dec 28, 2025 - Jan 3, 2026" across a year boundary). */
export function formatWeekRange(value: string | Date): string {
  const start = startOfWeek(new Date(value), WEEK_OPTIONS);
  const end = endOfWeek(new Date(value), WEEK_OPTIONS);
  if (!isSameYear(start, end)) return `${format(start, "MMM d, yyyy")} - ${format(end, "MMM d, yyyy")}`;
  return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
}

export const pluralize = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;

export const initialOf = (name: string): string => name.trim().charAt(0).toUpperCase() || "?";

/** "Mon, Feb 09, 08:13 PM" (Share modal subtitle) */
export const formatShareStamp = (value: string | Date): string => format(new Date(value), "EEE, MMM dd, hh:mm a");

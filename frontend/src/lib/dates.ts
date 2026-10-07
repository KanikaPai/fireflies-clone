import { format, isBefore, parseISO, startOfDay } from "date-fns";

/** A due date ("2026-10-07") is overdue once that day has passed and the item is still open. */
export function isOverdue(dueDate: string | null, completed: boolean, now: Date = new Date()): boolean {
  if (!dueDate || completed) return false;
  return isBefore(parseISO(dueDate), startOfDay(now));
}

/** "Oct 7" for a calendar date string from the API. */
export const formatDueDate = (dueDate: string): string => format(parseISO(dueDate), "MMM d");

/** Date -> "yyyy-MM-dd" in local time (what the API expects for `due_date`). */
export const toDateString = (date: Date): string => format(date, "yyyy-MM-dd");

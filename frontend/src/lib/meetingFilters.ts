import { format, subDays } from "date-fns";

import type { MeetingListParams } from "@/lib/api/types";

/** Library filter state, serialised in the URL so it survives refresh and can be shared. */
export type NotebookView = "my" | "all" | "shared" | "voice-agent";
export type DateRangePreset = "7d" | "30d" | "custom";
export type DurationPreset = "short" | "medium" | "long";
export type SortOrder = "newest" | "oldest";

export interface MeetingFilters {
  view: NotebookView;
  q: string;
  participantId: number | null;
  tagIds: number[]; // repeated `tag_id` URL params; a meeting matches ANY of them
  range: DateRangePreset | null;
  from: string | null; // yyyy-MM-dd, custom range only
  to: string | null;
  duration: DurationPreset | null;
  sort: SortOrder;
}

export const DATE_RANGE_LABELS: Record<DateRangePreset, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  custom: "Custom",
};

export const DURATION_LABELS: Record<DurationPreset, string> = {
  short: "Under 15 mins",
  medium: "15-30 mins",
  long: "Over 30 mins",
};

/** Duration presets as inclusive bounds in seconds (matching the API's min/max_duration). */
const DURATION_BOUNDS: Record<DurationPreset, { min?: number; max?: number }> = {
  short: { max: 15 * 60 - 1 },
  medium: { min: 15 * 60, max: 30 * 60 },
  long: { min: 30 * 60 + 1 },
};

const VIEWS: NotebookView[] = ["my", "all", "shared", "voice-agent"];
const oneOf = <T extends string>(value: string | null, allowed: readonly T[]): T | null =>
  allowed.includes(value as T) ? (value as T) : null;

export function parseFilters(params: URLSearchParams): MeetingFilters {
  const participant = Number(params.get("participant"));
  const range = oneOf(params.get("range"), ["7d", "30d", "custom"] as const);
  const tagIds = [...new Set(params.getAll("tag_id").map(Number))].filter((id) => Number.isInteger(id) && id > 0);
  return {
    view: oneOf(params.get("view"), VIEWS) ?? "my",
    q: params.get("q") ?? "",
    participantId: Number.isInteger(participant) && participant > 0 ? participant : null,
    tagIds,
    range,
    from: range === "custom" ? params.get("from") : null,
    to: range === "custom" ? params.get("to") : null,
    duration: oneOf(params.get("duration"), ["short", "medium", "long"] as const),
    sort: params.get("sort") === "oldest" ? "oldest" : "newest",
  };
}

/** Number of active filters (search, participant, tags, date range, duration); view and sort don't count. */
export const activeFilterCount = (f: MeetingFilters): number =>
  [f.q.trim(), f.participantId, f.tagIds.length > 0, f.range, f.duration].filter(Boolean).length;

const isoDay = (date: Date): string => format(date, "yyyy-MM-dd");

/** Translate UI filters into GET /api/meetings query params. */
export function toApiParams(f: MeetingFilters, today: Date = new Date()): Omit<MeetingListParams, "page"> {
  const params: Omit<MeetingListParams, "page"> = { sort: f.sort === "oldest" ? "oldest" : "recent" };
  if (f.q.trim()) params.q = f.q.trim();
  if (f.participantId) params.participant_id = f.participantId;
  if (f.tagIds.length) params.tag_id = f.tagIds;
  if (f.range === "7d") params.date_from = isoDay(subDays(today, 7));
  if (f.range === "30d") params.date_from = isoDay(subDays(today, 30));
  if (f.range === "custom") {
    if (f.from) params.date_from = f.from;
    if (f.to) params.date_to = f.to;
  }
  if (f.duration) {
    const { min, max } = DURATION_BOUNDS[f.duration];
    if (min !== undefined) params.min_duration = min;
    if (max !== undefined) params.max_duration = max;
  }
  return params;
}

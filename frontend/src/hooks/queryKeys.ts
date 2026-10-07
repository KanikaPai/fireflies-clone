import type { MeetingListParams } from "@/lib/api/types";

/** All TanStack Query keys live here so invalidation stays consistent. */
export const queryKeys = {
  me: ["me"] as const,
  settings: ["settings"] as const,
  parse: (key: string) => ["parse", key] as const,
  meetings: {
    all: ["meetings"] as const,
    list: (params: MeetingListParams) => ["meetings", "list", params] as const,
    /** Ready in the last 24 h (Meeting Status). The cut-off time is computed when fetching, so it is not part of the key. */
    recent: (dateFrom?: string) => ["meetings", "recent", dateFrom ?? "all"] as const,
    detail: (id: number) => ["meetings", "detail", id] as const,
    transcript: (id: number) => ["meetings", "transcript", id] as const,
    insights: (id: number) => ["meetings", "insights", id] as const,
    shares: (id: number) => ["meetings", "shares", id] as const,
    highlights: (id: number) => ["meetings", "highlights", id] as const,
  },
  actionItems: {
    all: ["action-items"] as const,
    list: (completed?: boolean) => ["action-items", "list", completed ?? "all"] as const,
  },
  people: ["people"] as const,
  tags: ["tags"] as const,
  searchAll: ["search"] as const,
  search: (q: string) => ["search", q] as const,
};

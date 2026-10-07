import type { MeetingListParams } from "@/lib/api/types";

/** All TanStack Query keys live here so invalidation stays consistent. */
export const queryKeys = {
  me: ["me"] as const,
  meetings: {
    all: ["meetings"] as const,
    list: (params: MeetingListParams) => ["meetings", "list", params] as const,
    detail: (id: number) => ["meetings", "detail", id] as const,
  },
  actionItems: {
    all: ["action-items"] as const,
    list: (completed?: boolean) => ["action-items", "list", completed ?? "all"] as const,
  },
  people: ["people"] as const,
  tags: ["tags"] as const,
  search: (q: string) => ["search", q] as const,
};

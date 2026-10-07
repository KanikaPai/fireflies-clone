import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";

import { listMeetings } from "@/lib/api/meetings";
import type { MeetingListParams } from "@/lib/api/types";

import { queryKeys } from "./queryKeys";

const DEFAULT_PAGE_SIZE = 20;

/** Paginated meeting list; `fetchNextPage` loads the next page ("Load more"). */
export function useMeetings(params: Omit<MeetingListParams, "page"> = {}) {
  const pageSize = params.page_size ?? DEFAULT_PAGE_SIZE;
  const base = { ...params, page_size: pageSize };
  return useInfiniteQuery({
    queryKey: queryKeys.meetings.list(base),
    queryFn: ({ pageParam, signal }) => listMeetings({ ...base, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.page_size < last.total ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
}

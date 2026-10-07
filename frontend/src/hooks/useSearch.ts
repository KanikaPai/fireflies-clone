import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { searchAll, type SearchOptions } from "@/lib/api/search";

import { queryKeys } from "./queryKeys";

/** Global search; disabled for an empty query. Keeps the previous results while the next ones load. */
export const useSearch = (q: string, options: SearchOptions = {}) => {
  const term = q.trim();
  return useQuery({
    queryKey: [...queryKeys.search(term), options],
    queryFn: ({ signal }) => searchAll(term, options, signal),
    enabled: term.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
};

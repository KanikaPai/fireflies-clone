import { useQuery } from "@tanstack/react-query";

import { listTags } from "@/lib/api/tags";

import { queryKeys } from "./queryKeys";

export const useTags = () => useQuery({ queryKey: queryKeys.tags, queryFn: ({ signal }) => listTags(signal) });

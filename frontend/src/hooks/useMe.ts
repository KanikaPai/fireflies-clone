import { useQuery } from "@tanstack/react-query";

import { getMe } from "@/lib/api/users";

import { queryKeys } from "./queryKeys";

export const useMe = () => useQuery({ queryKey: queryKeys.me, queryFn: ({ signal }) => getMe(signal), staleTime: Infinity });

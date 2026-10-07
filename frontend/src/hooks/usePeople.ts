import { useQuery } from "@tanstack/react-query";

import { listPeople } from "@/lib/api/people";

import { queryKeys } from "./queryKeys";

export const usePeople = () => useQuery({ queryKey: queryKeys.people, queryFn: ({ signal }) => listPeople(undefined, signal) });

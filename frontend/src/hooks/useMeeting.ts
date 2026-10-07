import { useQuery } from "@tanstack/react-query";

import { getMeeting } from "@/lib/api/meetings";

import { queryKeys } from "./queryKeys";

export const useMeeting = (id: number) =>
  useQuery({ queryKey: queryKeys.meetings.detail(id), queryFn: ({ signal }) => getMeeting(id, signal) });

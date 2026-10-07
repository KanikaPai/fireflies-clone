"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { invalidate } from "@/hooks/invalidation";
import { queryKeys } from "@/hooks/queryKeys";
import { useProcessingMeetings } from "@/hooks/useProcessingMeetings";
import { useSettings } from "@/hooks/useSettings";
import { getMeeting } from "@/lib/api/meetings";
import { finishedSince } from "@/lib/processing";
import { notify } from "@/lib/toast";

/**
 * Renders nothing. Watches the processing list (which polls every 2 s only while something is processing) and
 * announces when a meeting leaves it: `"<title> is ready"` with an Open action, or a failure message.
 * "Ready" toasts respect the notify-on-ready setting; failures are always shown.
 */
export function ProcessingWatcher() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data } = useProcessingMeetings();
  const settings = useSettings();
  const notifyOnReady = useRef(true);
  const previous = useRef<Map<number, string>>(new Map());

  useEffect(() => {
    notifyOnReady.current = settings.data?.notify_on_ready ?? true;
  }, [settings.data?.notify_on_ready]);

  useEffect(() => {
    if (!data) return;
    const current = new Map(data.items.map((meeting) => [meeting.id, meeting.title] as const));
    const finished = finishedSince(previous.current, current);
    previous.current = current;
    if (finished.length === 0) return;

    void invalidate.meetingCreated(queryClient);
    for (const id of finished) {
      queryClient
        .fetchQuery({ queryKey: queryKeys.meetings.detail(id), queryFn: ({ signal }) => getMeeting(id, signal), staleTime: 0 })
        .then((meeting) => {
          if (meeting.status === "ready" && notifyOnReady.current) {
            notify.withAction(`${meeting.title} is ready`, "Open", () => router.push(`/meetings/${meeting.id}`));
          } else if (meeting.status === "failed") {
            notify.error(`${meeting.title} couldn't be processed`);
          }
        })
        .catch(() => undefined); // deleted while processing: nothing to announce
    }
  }, [data, queryClient, router]);

  return null;
}

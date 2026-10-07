"use client";

import { CalendarDays, MessageSquare, Rows3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { formatWeekRange, pluralize, weekKey } from "@/components/common/formatters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMeetings } from "@/hooks/useMeetings";
import type { MeetingListItem } from "@/lib/api/types";
import { notify } from "@/lib/toast";

import { FeedMeeting } from "./FeedMeeting";

const FEED_SIZE = 20;

/** My Feed: meetings grouped by week, each with the summary bullets that come with the list response. */
export function FeedTab() {
  const router = useRouter();
  const list = useMeetings({ page_size: FEED_SIZE });
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);

  const groups = useMemo(() => {
    const result: { key: string; label: string; meetings: MeetingListItem[] }[] = [];
    for (const meeting of items) {
      const key = weekKey(meeting.meeting_date);
      const last = result.at(-1);
      if (last?.key === key) last.meetings.push(meeting);
      else result.push({ key, label: formatWeekRange(meeting.meeting_date), meetings: [meeting] });
    }
    return result;
  }, [items]);

  if (list.isPending) return <FeedSkeleton />;
  if (list.error) return <ErrorState title="Couldn't load your feed" message={list.error.message} onRetry={() => void list.refetch()} />;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Rows3}
        title="Meet Your AI-Powered Feed"
        description="Stay up to date with your meetings, catch up on important discussions at a glance."
        action={<Button onClick={() => router.push("/uploads")}>+ New</Button>}
      />
    );
  }
  return (
    <div className="divide-y divide-border">
      {groups.map((group) => (
        <section key={group.key} aria-label={group.label} className="py-6 first:pt-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-sans text-sm whitespace-nowrap text-text-secondary">
              <CalendarDays className="size-4 text-text-tertiary" aria-hidden="true" />
              {group.label}
              <span className="text-text-tertiary">· {pluralize(group.meetings.length, "Meeting")}</span>
            </h2>
            <Button variant="ghost" size="sm" aria-label="Share feedback" className="text-text-tertiary" onClick={() => notify.comingSoon("Feedback")}>
              <MessageSquare aria-hidden="true" /> <span className="hidden xl:inline">Share Feedback</span>
            </Button>
          </div>
          <div className="mt-2 divide-y divide-border">
            {group.meetings.map((meeting) => (
              <FeedMeeting key={meeting.id} meeting={meeting} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading feed" className="space-y-6 py-4">
      <Skeleton className="h-4 w-48" />
      {[0, 1].map((i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-5 w-72" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-10/12" />
        </div>
      ))}
    </div>
  );
}

"use client";

import { format, subDays } from "date-fns";
import { CalendarDays, Loader2, Zap } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { formatDate, formatTime } from "@/components/common/formatters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useMeetings } from "@/hooks/useMeetings";

const RANGES = { all: "All", "7d": "Last 7 days", "30d": "Last 30 days" } as const;
type Range = keyof typeof RANGES;

/** Meetings still being processed (status=processing), with a date-range dropdown. */
export function MeetingStatusPage() {
  const [range, setRange] = useState<Range>("all");
  const params = useMemo(
    () => ({
      status: "processing" as const,
      ...(range === "all" ? {} : { date_from: format(subDays(new Date(), range === "7d" ? 7 : 30), "yyyy-MM-dd") }),
    }),
    [range],
  );
  const { data, isPending, error, refetch } = useMeetings(params);
  const meetings = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="px-6 py-4">
      <div className="flex justify-end">
        <Select value={range} onValueChange={(v) => setRange(v as Range)}>
          <SelectTrigger aria-label="Date range" className="h-9 w-40 bg-surface text-sm text-text-secondary">
            <CalendarDays className="size-4 text-text-tertiary" aria-hidden="true" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {(Object.keys(RANGES) as Range[]).map((key) => (
              <SelectItem key={key} value={key}>
                {RANGES[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending && (
        <div aria-busy="true" className="mx-auto mt-6 max-w-3xl space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}
      {error && <ErrorState title="Couldn't load meeting status" message={error.message} onRetry={() => void refetch()} />}
      {!isPending && !error && meetings.length === 0 && (
        <EmptyState
          className="max-w-xl py-20"
          icon={Zap}
          title="No meetings are being processed"
          description="If you just had a meeting, it takes 5-10 mins to finish processing. In the meantime, you can check the status here"
        />
      )}
      {meetings.length > 0 && (
        <ul className="mx-auto mt-6 max-w-3xl divide-y divide-border rounded-xl bg-surface shadow-card">
          {meetings.map((meeting) => (
            <li key={meeting.id}>
              <Link href={`/meetings/${meeting.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-hover">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-text-primary">{meeting.title}</p>
                  <p className="text-[13px] text-text-tertiary">
                    {formatDate(meeting.meeting_date)} · {formatTime(meeting.meeting_date)}
                  </p>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning">
                  <Loader2 className="size-3 animate-spin" aria-hidden="true" /> Processing
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

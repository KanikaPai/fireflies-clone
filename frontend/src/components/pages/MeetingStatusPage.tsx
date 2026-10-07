"use client";

import { format, formatDistanceToNow, subDays } from "date-fns";
import { CalendarDays, CheckCircle2, Zap } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { formatDate, formatTime } from "@/components/common/formatters";
import { SubmitButton } from "@/components/common/SubmitButton";
import { ProcessingSteps } from "@/components/status/ProcessingSteps";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useRetryMeeting } from "@/hooks/useCreateMeeting";
import { useMeetingStatusLists } from "@/hooks/useProcessingMeetings";
import type { MeetingListItem } from "@/lib/api/types";

const RANGES = { all: "All", "7d": "Last 7 days", "30d": "Last 30 days" } as const;
type Range = keyof typeof RANGES;

/** Processing, failed and recently completed meetings. Polls every 2 s only while something is processing. */
export function MeetingStatusPage() {
  const [range, setRange] = useState<Range>("all");
  const dateFrom = range === "all" ? undefined : format(subDays(new Date(), range === "7d" ? 7 : 30), "yyyy-MM-dd");
  const { processing, failed, recent } = useMeetingStatusLists(dateFrom);
  const retry = useRetryMeeting();

  const error = processing.error ?? failed.error ?? recent.error;
  const pending = processing.isPending || failed.isPending || recent.isPending;
  const processingItems = processing.data?.items ?? [];
  const failedItems = failed.data?.items ?? [];
  const recentItems = recent.data?.items ?? [];
  const empty = processingItems.length + failedItems.length + recentItems.length === 0;

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

      {pending && (
        <div aria-busy="true" className="mx-auto mt-6 max-w-3xl space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}
      {error && <ErrorState title="Couldn't load meeting status" message={error.message} onRetry={() => void processing.refetch()} />}
      {!pending && !error && empty && (
        <EmptyState
          className="max-w-xl py-20"
          icon={Zap}
          title="No meetings are being processed"
          description="If you just had a meeting, it takes 5-10 mins to finish processing. In the meantime, you can check the status here"
        />
      )}

      {!pending && !error && !empty && (
        <div className="mx-auto mt-6 max-w-3xl space-y-8">
          <Section title="Processing" count={processingItems.length}>
            {processingItems.map((meeting) => (
              <StatusRow key={meeting.id} meeting={meeting}>
                <ProcessingSteps status="processing" />
              </StatusRow>
            ))}
          </Section>
          <Section title="Failed" count={failedItems.length}>
            {failedItems.map((meeting) => (
              <StatusRow
                key={meeting.id}
                meeting={meeting}
                action={
                  <SubmitButton size="sm" variant="outline" pending={retry.isPending && retry.variables === meeting.id} onClick={() => retry.mutate(meeting.id)}>
                    Retry
                  </SubmitButton>
                }
              >
                <ProcessingSteps status="failed" />
                {meeting.error_message && (
                  <p role="alert" className="mt-1.5 text-xs text-danger">
                    {meeting.error_message}
                  </p>
                )}
              </StatusRow>
            ))}
          </Section>
          <Section title="Recently completed" count={recentItems.length}>
            {recentItems.map((meeting) => (
              <StatusRow
                key={meeting.id}
                meeting={meeting}
                action={
                  <Button asChild size="sm" variant="soft">
                    <Link href={`/meetings/${meeting.id}`}>Open</Link>
                  </Button>
                }
              >
                <p className="flex items-center gap-1.5 text-[13px] text-text-secondary">
                  <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
                  Ready{meeting.processed_at ? ` ${formatDistanceToNow(new Date(meeting.processed_at), { addSuffix: true })}` : ""}
                </p>
              </StatusRow>
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <section aria-label={title}>
      <h2 className="mb-2 flex items-baseline gap-2 font-sans text-sm font-medium text-text-primary">
        {title} <span className="font-normal text-text-tertiary">· {count}</span>
      </h2>
      <ul className="divide-y divide-border rounded-xl bg-surface shadow-card">{children}</ul>
    </section>
  );
}

function StatusRow({ meeting, children, action }: { meeting: MeetingListItem; children: ReactNode; action?: ReactNode }) {
  return (
    <li className="flex items-center gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <Link href={`/meetings/${meeting.id}`} className="block truncate text-[15px] font-medium text-text-primary hover:text-brand hover:underline">
          {meeting.title}
        </Link>
        <p className="mb-1.5 text-[13px] text-text-tertiary">
          {formatDate(meeting.meeting_date)} · {formatTime(meeting.meeting_date)}
        </p>
        {children}
      </div>
      {action}
    </li>
  );
}

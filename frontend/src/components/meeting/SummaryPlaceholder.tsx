"use client";

import { AlertCircle, FileText, Sparkles } from "lucide-react";

import { SubmitButton } from "@/components/common/SubmitButton";
import { Skeleton } from "@/components/ui/skeleton";
import { useRetryMeeting } from "@/hooks/useCreateMeeting";
import type { MeetingDetail } from "@/lib/api/types";

/** What the summary area shows while there is no summary: generating (skeleton), failed (retry) or no transcript. */
export function SummaryPlaceholder({ meeting }: { meeting: MeetingDetail }) {
  const retry = useRetryMeeting();

  if (meeting.status === "processing") {
    return (
      <div role="status" aria-busy="true" aria-label="Generating notes" className="mt-5">
        <p className="flex items-center gap-2 text-sm font-medium text-brand-soft-foreground">
          <Sparkles className="size-4 animate-pulse" aria-hidden="true" /> Generating notes…
        </p>
        <div className="mt-4 space-y-3">
          {["w-full", "w-11/12", "w-full", "w-4/5", "w-10/12"].map((width, i) => (
            <Skeleton key={i} className={`h-4 ${width}`} />
          ))}
        </div>
        <p className="mt-4 text-xs text-text-tertiary">The transcript is ready to read while the summary, notes and action items are prepared.</p>
      </div>
    );
  }

  if (meeting.status === "failed") {
    return (
      <div role="alert" className="mt-5 rounded-lg border border-destructive/30 bg-danger-soft px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-medium text-danger">
          <AlertCircle className="size-4" aria-hidden="true" /> We couldn&rsquo;t generate notes for this meeting
        </p>
        {meeting.error_message && <p className="mt-1 text-[13px] text-danger">{meeting.error_message}</p>}
        <SubmitButton className="mt-3" size="sm" variant="outline" pending={retry.isPending} onClick={() => retry.mutate(meeting.id)}>
          Retry
        </SubmitButton>
      </div>
    );
  }

  return (
    <p className="mt-5 flex items-center gap-2 text-sm text-text-tertiary">
      <FileText className="size-4" aria-hidden="true" /> No summary yet. Add a transcript to generate notes.
    </p>
  );
}

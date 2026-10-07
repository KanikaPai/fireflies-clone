"use client";

import { Calendar, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function UpcomingMeetingsCard() {
  const router = useRouter();
  return (
    <section aria-labelledby="upcoming-heading" className="rounded-xl bg-surface shadow-card">
      <h2 id="upcoming-heading" className="flex items-center gap-2 border-b border-border px-5 py-3.5 font-sans text-sm font-medium text-text-primary">
        <Calendar className="size-4 text-info" aria-hidden="true" />
        Upcoming Meetings
      </h2>
      <div className="flex flex-col items-center px-6 py-10 text-center">
        <Calendar className="mb-3 size-6 text-text-tertiary" aria-hidden="true" />
        <p className="text-sm font-semibold text-text-primary">No meetings in the next 2 days</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-text-tertiary">
          Schedule a meeting on your calendar or transcribe a live meeting.
        </p>
        <Button size="sm" className="mt-5" onClick={() => router.push("/uploads")}>
          <Plus aria-hidden="true" /> New
        </Button>
      </div>
    </section>
  );
}

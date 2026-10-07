"use client";

import { useState } from "react";

import { PlayerBar } from "@/components/player/PlayerBar";
import type { MeetingDetail, Segment } from "@/lib/api/types";
import { cn } from "@/lib/utils";

import { ActionItemsSection } from "./ActionItemsSection";
import { LeftPanel } from "./LeftPanel";
import { MeetingHeader } from "./MeetingHeader";
import { NotesSection } from "./NotesSection";
import { SummaryPanel } from "./SummaryPanel";
import { TranscriptColumn } from "./TranscriptColumn";

type MobileTab = "summary" | "transcript";

interface MeetingLayoutProps {
  meeting: MeetingDetail;
  segments: Segment[];
}

/**
 * Three columns on lg+: left tools | main (summary, notes, actions + player bar) | transcript.
 * Below lg the main and transcript columns become "Summary" / "Transcript" tabs and the player bar
 * stays visible under both.
 */
export function MeetingLayout({ meeting, segments }: MeetingLayoutProps) {
  const [tab, setTab] = useState<MobileTab>("summary");

  return (
    <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto] lg:grid-cols-[auto_minmax(0,1fr)_minmax(380px,36%)] lg:grid-rows-[minmax(0,1fr)_auto]">
      <LeftPanel meetingId={meeting.id} chapters={meeting.chapters} />

      <div role="tablist" aria-label="Meeting view" className="flex border-b border-border bg-surface lg:hidden">
        {(["summary", "transcript"] as const).map((key) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn("h-11 flex-1 border-b-2 text-sm font-medium capitalize", tab === key ? "border-brand text-brand-soft-foreground" : "border-transparent text-text-secondary")}
          >
            {key}
          </button>
        ))}
      </div>

      <main className={cn("row-start-2 min-h-0 overflow-y-auto lg:col-start-2 lg:row-start-1", tab === "summary" ? "block" : "hidden lg:block")}>
        <div className="mx-auto w-full max-w-[760px] px-5 py-8 sm:px-8 lg:py-10">
          <MeetingHeader meeting={meeting} segments={segments} />
          <div className="mt-8">
            <SummaryPanel meeting={meeting} />
            <NotesSection chapters={meeting.chapters} />
            <ActionItemsSection meetingId={meeting.id} items={meeting.action_items} segments={segments} />
          </div>
        </div>
      </main>

      <aside
        aria-label="Transcript"
        className={cn("row-start-2 min-h-0 flex-col border-l border-border bg-surface lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:flex", tab === "transcript" ? "flex" : "hidden")}
      >
        <TranscriptColumn meetingId={meeting.id} segments={segments} />
      </aside>

      <div className="row-start-3 lg:col-start-2 lg:row-start-2">
        <PlayerBar />
      </div>
    </div>
  );
}

"use client";

import { Check, Download, Pause, Play, RotateCcw, RotateCw, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";

import { DownloadMenuItems } from "@/components/meeting-actions/DownloadMenuItems";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatClockPair } from "@/lib/player/timeFormat";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

import { useDuration, useElapsedSeconds, usePlayerActions, usePlayerState } from "./hooks";
import { ProgressBar } from "./ProgressBar";

const SKIP_MS = 15_000;

function TimeReadout() {
  const seconds = useElapsedSeconds(); // re-renders once a second, not per frame
  const duration = useDuration();
  return (
    <span className="text-[13px] text-text-secondary tabular-nums" aria-label="Playback position">
      {formatClockPair(seconds * 1000, duration)}
    </span>
  );
}

const FEEDBACK = [
  { key: "star", icon: Star, label: "Star", on: "Meeting starred", off: "Star removed" },
  { key: "check", icon: Check, label: "Mark as reviewed", on: "Marked as reviewed", off: "Review mark removed" },
  { key: "up", icon: ThumbsUp, label: "Good meeting notes", on: "Thanks for the feedback", off: "Feedback removed" },
  { key: "down", icon: ThumbsDown, label: "Poor meeting notes", on: "Thanks for the feedback", off: "Feedback removed" },
] as const;

export function PlayerBar({ meetingId }: { meetingId: number }) {
  const actions = usePlayerActions();
  const { playing, rate } = usePlayerState();
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  const toggle = (key: string, on: string, off: string) => {
    const next = !toggled[key];
    // thumbs up/down are mutually exclusive
    setToggled((prev) => ({ ...prev, [key]: next, ...(next && key === "up" ? { down: false } : {}), ...(next && key === "down" ? { up: false } : {}) }));
    notify.info(next ? on : off);
  };

  return (
    <div role="region" aria-label="Media player" className="border-t border-border bg-surface">
      <ProgressBar />
      <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-2 px-4">
        <TimeReadout />
        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={actions.cycleRate} aria-label={`Playback speed ${rate}x, click to change`} className="w-11 text-[13px] text-text-secondary tabular-nums">
            {rate}×
          </Button>
          <Button variant="ghost" size="icon" aria-label="Back 15 seconds" onClick={() => actions.skip(-SKIP_MS)} className="text-text-secondary">
            <RotateCcw aria-hidden="true" />
          </Button>
          <Button onClick={actions.toggle} aria-label={playing ? "Pause" : "Play"} className="h-9 w-14 rounded-full">
            {playing ? <Pause className="fill-current" aria-hidden="true" /> : <Play className="fill-current" aria-hidden="true" />}
          </Button>
          <Button variant="ghost" size="icon" aria-label="Forward 15 seconds" onClick={() => actions.skip(SKIP_MS)} className="text-text-secondary">
            <RotateCw aria-hidden="true" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Download" className="hidden text-text-secondary sm:inline-flex">
                <Download aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="top" className="w-60">
              <DownloadMenuItems meetingId={meetingId} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center justify-end gap-0.5">
          {FEEDBACK.map(({ key, icon: Icon, label, on, off }) => (
            <Button key={key} variant="ghost" size="icon-sm" aria-label={label} aria-pressed={!!toggled[key]} onClick={() => toggle(key, on, off)} className={cn("hidden text-text-secondary sm:inline-flex", toggled[key] && "bg-brand-soft text-brand")}>
              <Icon className={cn(toggled[key] && key === "star" && "fill-current")} aria-hidden="true" />
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

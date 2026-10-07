"use client";

import { useTimeSelector } from "@/components/player/hooks";
import type { Chapter } from "@/lib/api/types";
import { findActiveIndex } from "@/lib/player/activeSegment";
import { formatClock } from "@/lib/player/timeFormat";
import { cn } from "@/lib/utils";

import { useSeekTo } from "./TranscriptSync";

/** Chapter list with timestamps; click to seek, the chapter containing the current time is highlighted. */
export function OutlinePanel({ chapters }: { chapters: Chapter[] }) {
  const seekTo = useSeekTo();
  const starts = chapters.map((c) => c.start_ms);
  const activeIndex = useTimeSelector((timeMs) => findActiveIndex(starts, timeMs));

  if (chapters.length === 0) return <p className="p-4 text-sm text-text-tertiary">No outline yet.</p>;
  return (
    <ol className="space-y-0.5 p-2" aria-label="Meeting outline">
      {chapters.map((chapter, index) => (
        <li key={chapter.id}>
          <button
            type="button"
            onClick={() => seekTo(chapter.start_ms)}
            aria-current={index === activeIndex ? "true" : undefined}
            className={cn(
              "flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-surface-hover",
              index === activeIndex && "bg-brand-soft hover:bg-brand-soft",
            )}
          >
            <span className="mt-0.5 shrink-0 text-xs text-info tabular-nums">{formatClock(chapter.start_ms)}</span>
            <span className={cn("text-[13px] leading-snug", index === activeIndex ? "font-medium text-brand-soft-foreground" : "text-text-primary")}>
              {chapter.title}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

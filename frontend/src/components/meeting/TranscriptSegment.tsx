"use client";

import { ChevronDown } from "lucide-react";
import { memo } from "react";

import { PersonAvatar } from "@/components/common/PersonAvatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Segment } from "@/lib/api/types";
import { cn } from "@/lib/utils";

import { TimeLink } from "./TimeLink";
import { ActiveSegmentText, StaticSegmentText, type MatchRange } from "./TranscriptSegmentText";

interface TranscriptSegmentProps {
  segment: Segment;
  isActive: boolean;
  ranges: readonly MatchRange[];
  /** Index of the current search match within this segment's ranges, or -1. */
  currentMatch: number;
  /** True when the transcript is already narrowed to this segment's speaker. */
  speakerFiltered: boolean;
  /** Stable callbacks (declared outside the render loop) so memoisation holds. */
  onSeek: (ms: number) => void;
  onToggleSpeaker: (personId: number, name: string) => void;
}

const NO_RANGES: readonly MatchRange[] = [];

/**
 * One transcript turn. Memoised: while playing, only the segment losing and the one gaining "active"
 * re-render when the active index changes; every other segment is skipped.
 */
export const TranscriptSegment = memo(function TranscriptSegment({
  segment,
  isActive,
  ranges,
  currentMatch,
  speakerFiltered,
  onSeek,
  onToggleSpeaker,
}: TranscriptSegmentProps) {
  const { speaker } = segment;
  return (
    <article
      data-segment-id={segment.id}
      data-active={isActive ? "true" : undefined}
      className={cn("rounded-lg px-3 py-3 transition-colors", isActive && "bg-brand-soft/50")}
    >
      <div className="flex items-center gap-2 text-sm">
        <PersonAvatar name={speaker.name} color={speaker.avatar_color} size="xs" className="rounded-[4px]" />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 rounded font-medium text-text-secondary hover:text-text-primary">
            {speaker.name} <ChevronDown className="size-3.5" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={() => onToggleSpeaker(speaker.id, speaker.name)}>
              {speakerFiltered ? "Show all speakers" : "Show only this speaker"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <span aria-hidden="true" className="text-text-tertiary">·</span>
        <TimeLink ms={segment.start_ms} parenthesized={false} className="text-[13px] underline" />
      </div>
      {/* Clicking the text seeks, unless the user is selecting text to copy it. */}
      <p
        onClick={() => !window.getSelection()?.toString() && onSeek(segment.start_ms)}
        className="mt-1.5 cursor-pointer pl-7 text-[15px] leading-[1.7] text-text-secondary"
      >
        {isActive ? (
          <ActiveSegmentText text={segment.text} startMs={segment.start_ms} endMs={segment.end_ms} ranges={ranges} currentMatch={currentMatch} />
        ) : (
          <StaticSegmentText text={segment.text} ranges={ranges.length ? ranges : NO_RANGES} currentMatch={currentMatch} />
        )}
      </p>
    </article>
  );
});

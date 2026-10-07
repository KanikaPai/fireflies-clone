"use client";

import { ChevronDown } from "lucide-react";
import { memo } from "react";

import { PersonAvatar } from "@/components/common/PersonAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Highlight, PersonBrief, Segment } from "@/lib/api/types";
import type { TextMark } from "@/lib/player/textSlices";
import { cn } from "@/lib/utils";

import { SegmentComments } from "./SegmentComments";
import { TimeLink } from "./TimeLink";
import { TranscriptSegmentEditor } from "./TranscriptSegmentEditor";
import { ActiveSegmentText, StaticSegmentText, type MatchRange } from "./TranscriptSegmentText";

interface TranscriptSegmentProps {
  meetingId: number;
  segment: Segment;
  /** Edit mode: the text is a textarea and clicking it does not seek. */
  editing: boolean;
  /** People a segment can be attributed to (participants and existing speakers). */
  speakers: readonly PersonBrief[];
  onChangeSpeaker: (segmentId: number, person: PersonBrief) => void;
  onReassignAll: (from: PersonBrief, to: PersonBrief) => void;
  isActive: boolean;
  ranges: readonly MatchRange[];
  /** Index of the current search match within this segment's ranges, or -1. */
  currentMatch: number;
  /** True when the transcript is already narrowed to this segment's speaker. */
  speakerFiltered: boolean;
  /** Stable callbacks (declared outside the render loop) so memoisation holds. */
  onSeek: (ms: number) => void;
  onToggleSpeaker: (personId: number, name: string) => void;
  /** This segment's highlight / comment ranges, painted over the text. */
  marks: readonly TextMark[];
  /** Comments on this segment (with or without a range), shown behind the bubble icon. */
  comments: readonly Highlight[];
  onDeleteComment: (comment: Highlight) => void;
}

const NO_RANGES: readonly MatchRange[] = [];

/**
 * One transcript turn. Memoised: while playing, only the segment losing and the one gaining "active"
 * re-render when the active index changes; every other segment is skipped.
 */
export const TranscriptSegment = memo(function TranscriptSegment({
  meetingId,
  segment,
  editing,
  speakers,
  onChangeSpeaker,
  onReassignAll,
  isActive,
  ranges,
  currentMatch,
  speakerFiltered,
  onSeek,
  onToggleSpeaker,
  marks,
  comments,
  onDeleteComment,
}: TranscriptSegmentProps) {
  const { speaker } = segment;
  return (
    <article
      data-segment-id={segment.id}
      data-active={isActive ? "true" : undefined}
      className={cn(
        "rounded-lg px-3 py-3 transition-colors",
        isActive && "bg-brand-soft/50",
        editing && currentMatch >= 0 && "ring-2 ring-warning/60", // marks can't render inside a textarea
      )}
    >
      <div className="flex items-center gap-2 text-sm">
        <PersonAvatar name={speaker.name} color={speaker.avatar_color} size="xs" className="rounded-[4px]" />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 rounded font-medium text-text-secondary hover:text-text-primary">
            {speaker.name} <ChevronDown className="size-3.5" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuItem onSelect={() => onToggleSpeaker(speaker.id, speaker.name)}>
              {speakerFiltered ? "Show all speakers" : "Show only this speaker"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Change speaker for this segment</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {speakers
                  .filter((person) => person.id !== speaker.id)
                  .map((person) => (
                    <DropdownMenuItem key={person.id} onSelect={() => onChangeSpeaker(segment.id, person)}>
                      <PersonAvatar name={person.name} color={person.avatar_color} size="xs" /> {person.name}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Reassign all of {speaker.name}&rsquo;s segments to…</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {speakers
                  .filter((person) => person.id !== speaker.id)
                  .map((person) => (
                    <DropdownMenuItem key={person.id} onSelect={() => onReassignAll(speaker, person)}>
                      <PersonAvatar name={person.name} color={person.avatar_color} size="xs" /> {person.name}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
        <span aria-hidden="true" className="text-text-tertiary">·</span>
        <TimeLink ms={segment.start_ms} parenthesized={false} className="text-[13px] underline" />
        <SegmentComments comments={comments} onDelete={onDeleteComment} />
      </div>
      {editing ? (
        <TranscriptSegmentEditor meetingId={meetingId} segment={segment} />
      ) : (
        /* Clicking the text seeks (and plays), unless the user is selecting text to copy it. */
        <p
          data-segment-text
          onClick={() => !window.getSelection()?.toString() && onSeek(segment.start_ms)}
          className="mt-1.5 cursor-pointer pl-7 text-[15px] leading-[1.7] text-text-secondary"
        >
          {isActive ? (
            <ActiveSegmentText text={segment.text} startMs={segment.start_ms} endMs={segment.end_ms} ranges={ranges} currentMatch={currentMatch} marks={marks} />
          ) : (
            <StaticSegmentText text={segment.text} ranges={ranges.length ? ranges : NO_RANGES} currentMatch={currentMatch} marks={marks} />
          )}
        </p>
      )}
    </article>
  );
});

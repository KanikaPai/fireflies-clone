"use client";

import { PersonAvatar } from "@/components/common/PersonAvatar";
import { useActiveSegmentIndex } from "@/components/player/hooks";
import type { PersonBrief, Segment } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface VideoPanelProps {
  segments: Segment[];
  participants: PersonBrief[];
}

/** Stand-in for the video: one tile per participant with the current speaker highlighted. */
export function VideoPanel({ segments, participants }: VideoPanelProps) {
  const starts = segments.map((s) => s.start_ms);
  const activeIndex = useActiveSegmentIndex(starts);
  const activeSpeakerId = activeIndex >= 0 ? segments[activeIndex]?.speaker.id : null;

  return (
    <div className="grid grid-cols-2 gap-3 rounded-lg bg-surface-sunken p-3 sm:grid-cols-3" role="group" aria-label="Meeting video (simulated)">
      {participants.map((person) => {
        const speaking = person.id === activeSpeakerId;
        return (
          <div
            key={person.id}
            className={cn(
              "flex aspect-video flex-col items-center justify-center gap-2 rounded-md bg-surface ring-2 transition-shadow",
              speaking ? "ring-brand" : "ring-transparent",
            )}
          >
            <PersonAvatar name={person.name} color={person.avatar_color} size="lg" className="size-12 text-lg" />
            <span className="max-w-full truncate px-2 text-xs text-text-secondary">{person.name}</span>
            {speaking && <span className="text-[11px] font-medium text-brand">Speaking</span>}
          </div>
        );
      })}
    </div>
  );
}

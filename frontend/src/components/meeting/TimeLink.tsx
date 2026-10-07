"use client";

import { formatClock } from "@/lib/player/timeFormat";
import { cn } from "@/lib/utils";

import { useSeekTo } from "./TranscriptSync";

interface TimeLinkProps {
  ms: number;
  /** Render as "(03:09)" (notes, action items) or bare "03:09" (transcript). */
  parenthesized?: boolean;
  className?: string;
}

/** Blue underlined timestamp that seeks the player when clicked. */
export function TimeLink({ ms, parenthesized = true, className }: TimeLinkProps) {
  const seekTo = useSeekTo();
  const label = formatClock(ms);
  return (
    <button
      type="button"
      onClick={() => seekTo(ms)}
      aria-label={`Jump to ${label}`}
      className={cn("cursor-pointer rounded-sm text-info underline-offset-2 hover:underline", className)}
    >
      {parenthesized ? `(${label})` : label}
    </button>
  );
}

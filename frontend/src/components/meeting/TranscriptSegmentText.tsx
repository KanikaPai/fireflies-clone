"use client";

import { memo, useMemo } from "react";

import { useTimeSelector } from "@/components/player/hooks";
import type { TextMatch } from "@/lib/player/findMatches";
import { buildSlices, type TextMark, type TextSlice } from "@/lib/player/textSlices";
import { spokenCharOffset, spokenWordCount, wordSpans } from "@/lib/player/wordProgress";
import { cn } from "@/lib/utils";

import { HighlightMark } from "./HighlightMark";

export type MatchRange = Pick<TextMatch, "start" | "end">;

function Slices({ slices, currentMatch }: { slices: TextSlice[]; currentMatch: number }) {
  return (
    <>
      {slices.map((slice, i) => {
        const content = slice.match >= 0 ? (
          <mark
            data-current-match={slice.match === currentMatch ? "true" : undefined}
            className={cn("rounded-sm px-0.5 text-text-primary", slice.match === currentMatch ? "bg-warning/60" : "bg-warning-soft")}
          >
            {slice.text}
          </mark>
        ) : (
          slice.text
        );
        // Layers, inside out: search match, spoken colour, comment underline, user highlight.
        let node = slice.spoken ? <span className="text-brand">{content}</span> : <>{content}</>;
        if (slice.commentIds.length > 0) {
          node = <span className="underline decoration-text-tertiary decoration-dashed decoration-1 underline-offset-4">{node}</span>;
        }
        if (slice.highlightIds.length > 0) node = <HighlightMark id={slice.highlightIds[0]}>{node}</HighlightMark>;
        return <span key={i}>{node}</span>;
      })}
    </>
  );
}

interface TextProps {
  text: string;
  ranges: readonly MatchRange[];
  currentMatch: number;
  /** User highlights and comment ranges to paint over the text. */
  marks: readonly TextMark[];
}

/** Inactive segment: plain text, plus <mark> highlights when searching. */
export const StaticSegmentText = memo(function StaticSegmentText({ text, ranges, currentMatch, marks }: TextProps) {
  const slices = useMemo(() => (ranges.length || marks.length ? buildSlices(text, ranges, 0, marks) : null), [text, ranges, marks]);
  return slices ? <Slices slices={slices} currentMatch={currentMatch} /> : <>{text}</>;
});

/**
 * The segment being played: words already "spoken" (estimated by interpolating time across the words)
 * turn purple. Subscribes to time through a word-count selector, so it re-renders only when another
 * word is reached, a few times a second, and only this one segment does.
 */
export function ActiveSegmentText({ text, startMs, endMs, ranges, currentMatch, marks }: TextProps & { startMs: number; endMs: number }) {
  const spans = useMemo(() => wordSpans(text), [text]);
  const spokenWords = useTimeSelector((timeMs) => spokenWordCount(spans, startMs, endMs, timeMs));
  const slices = buildSlices(text, ranges, spokenCharOffset(spans, spokenWords), marks);
  return <Slices slices={slices} currentMatch={currentMatch} />;
}

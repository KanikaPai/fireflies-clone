"use client";

import { ChevronUp, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useActiveSegmentIndex } from "@/components/player/hooks";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useInsights } from "@/hooks/useMeeting";
import type { Segment } from "@/lib/api/types";
import { findMatches, stepIndex } from "@/lib/player/findMatches";

import { useTranscriptFilter } from "./TranscriptFilter";
import { TranscriptSearch } from "./TranscriptSearch";
import { TranscriptSegment } from "./TranscriptSegment";
import type { MatchRange } from "./TranscriptSegmentText";
import { scrollToCenter, useTranscriptScroll } from "./useTranscriptScroll";
import { useSeekTo, useTranscriptSync } from "./TranscriptSync";

const NO_RANGES: readonly MatchRange[] = [];

interface TranscriptPanelProps {
  meetingId: number;
  segments: Segment[];
}

export function TranscriptPanel({ meetingId, segments }: TranscriptPanelProps) {
  const { filter, setFilter, toggleFilter } = useTranscriptFilter();
  const { data: insights } = useInsights(meetingId);
  const seekTo = useSeekTo();
  const { setSynced } = useTranscriptSync();
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- which segments are shown (Smart Search category / speaker filter) ---
  const visible = useMemo(() => {
    if (!filter) return segments;
    if (filter.kind === "speaker") return segments.filter((s) => s.speaker.id === filter.personId);
    const ids = new Set(insights?.filters.find((f) => f.key === filter.key)?.segment_ids ?? []);
    return segments.filter((s) => ids.has(s.id));
  }, [segments, filter, insights]);

  // --- playback position: re-renders this panel only when the active segment changes ---
  const starts = useMemo(() => segments.map((s) => s.start_ms), [segments]);
  const activeIndex = useActiveSegmentIndex(starts);
  const activeId = activeIndex >= 0 ? segments[activeIndex].id : null;
  const { synced, resync } = useTranscriptScroll(scrollRef, activeId);

  // --- find (debounced, case-insensitive; navigation wraps) ---
  const [input, setInput] = useState("");
  const query = useDebouncedValue(input, 200);
  const matches = useMemo(() => findMatches(visible.map((s) => s.text), query), [visible, query]);
  const [matchPosition, setMatchPosition] = useState(0);
  const current = Math.min(matchPosition, Math.max(0, matches.length - 1));

  const rangesBySegment = useMemo(() => {
    const map = new Map<number, { ranges: MatchRange[]; firstIndex: number }>();
    matches.forEach((m, i) => {
      const id = visible[m.index].id;
      const entry = map.get(id) ?? { ranges: [], firstIndex: i };
      entry.ranges.push({ start: m.start, end: m.end });
      map.set(id, entry);
    });
    return map;
  }, [matches, visible]);

  useEffect(() => {
    // Scroll the current match into view (the user is navigating, so stop following playback).
    if (!query.trim() || matches.length === 0 || !scrollRef.current) return;
    const el = scrollRef.current.querySelector<HTMLElement>('[data-current-match="true"]');
    if (el) {
      setSynced(false);
      scrollToCenter(scrollRef.current, el);
    }
  }, [current, matches, query, setSynced]);

  const clearSearch = () => {
    setInput("");
    setMatchPosition(0);
  };
  const step = (delta: 1 | -1) => setMatchPosition(stepIndex(current, delta, matches.length));

  const onToggleSpeaker = useCallback(
    (personId: number, name: string) => toggleFilter({ kind: "speaker", personId, label: name }),
    [toggleFilter],
  );
  const speakerFilterId = filter?.kind === "speaker" ? filter.personId : null;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="px-4 pb-2">
        <TranscriptSearch
          value={input}
          onChange={(value) => {
            setInput(value);
            setMatchPosition(0);
          }}
          total={matches.length}
          current={current}
          onStep={step}
          onClear={clearSearch}
        />
      </div>

      {filter && (
        <div className="px-4 pb-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand-soft-foreground">
            Showing: {filter.label} ({visible.length})
            <button type="button" aria-label="Clear filter" onClick={() => setFilter(null)} className="rounded-full hover:bg-brand-soft-hover">
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </span>
        </div>
      )}

      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto px-3 pb-24" aria-label="Transcript">
        {visible.length === 0 && <p className="px-3 py-10 text-center text-sm text-text-tertiary">No transcript segments match this filter.</p>}
        {visible.map((segment) => {
          const entry = rangesBySegment.get(segment.id);
          const currentInSegment = entry && current >= entry.firstIndex && current < entry.firstIndex + entry.ranges.length ? current - entry.firstIndex : -1;
          return (
            <TranscriptSegment
              key={segment.id}
              segment={segment}
              isActive={segment.id === activeId}
              ranges={entry?.ranges ?? NO_RANGES}
              currentMatch={currentInSegment}
              speakerFiltered={speakerFilterId === segment.speaker.id}
              onSeek={seekTo}
              onToggleSpeaker={onToggleSpeaker}
            />
          );
        })}
      </div>

      {!synced && activeId !== null && (
        <Button onClick={resync} className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full shadow-popover">
          <ChevronUp aria-hidden="true" /> Sync with audio
        </Button>
      )}
    </div>
  );
}

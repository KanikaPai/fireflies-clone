"use client";

import { useSearchParams } from "next/navigation";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";

import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { useReplaceInTranscript, useUpdateSegment } from "@/hooks/useTranscriptEdit";
import type { Segment } from "@/lib/api/types";
import { findMatches, nearestMatchIndex, replaceRange, stepIndex } from "@/lib/player/findMatches";
import { parseTimeParam } from "@/lib/player/timeFormat";
import { notify } from "@/lib/toast";

import type { MatchRange } from "./TranscriptSegmentText";
import { scrollToCenter } from "./useTranscriptScroll";
import { useTranscriptSync } from "./TranscriptSync";

interface UseTranscriptFindOptions {
  /** The segments currently shown (after any filter); matches index into this list. */
  visible: Segment[];
  scrollRef: RefObject<HTMLDivElement | null>;
  editing: boolean;
  /** True when a category/speaker filter limits the list, so Replace all only touches what is shown. */
  filtered: boolean;
  updateSegment: ReturnType<typeof useUpdateSegment>;
  replaceAll: ReturnType<typeof useReplaceInTranscript>;
}

/**
 * Find / replace state for the transcript: a debounced, case-insensitive query, match navigation that wraps,
 * per-segment highlight ranges, scroll-to-match, and Replace / Replace all.
 */
export function useTranscriptFind({ visible, scrollRef, editing, filtered, updateSegment, replaceAll }: UseTranscriptFindOptions) {
  const { setSynced } = useTranscriptSync();
  // A search result links here with ?q=<term>&t=<sec>: pre-fill Find so the matches are highlighted.
  const searchParams = useSearchParams();
  const [input, setInput] = useState(() => searchParams.get("q") ?? "");
  const [replaceValue, setReplaceValue] = useState("");
  const query = useDebouncedValue(input, 200);
  const matches = useMemo(() => findMatches(visible.map((s) => s.text), query), [visible, query]);
  const [matchPosition, setMatchPosition] = useState(0);
  const current = Math.min(matchPosition, Math.max(0, matches.length - 1));

  // Arriving from a search result: start on the match nearest the linked time (once).
  const linkedTimeMs = useRef(searchParams.get("q") ? parseTimeParam(searchParams.get("t")) : null);
  useEffect(() => {
    if (linkedTimeMs.current === null || matches.length === 0) return;
    setMatchPosition(nearestMatchIndex(matches.map((m) => visible[m.index].start_ms), linkedTimeMs.current));
    linkedTimeMs.current = null;
  }, [matches, visible]);

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
    // Outside edit mode the current <mark> is centred; in edit mode (textareas) the whole segment is.
    const segmentId = visible[matches[current]?.index]?.id;
    const el = scrollRef.current.querySelector<HTMLElement>(editing ? `[data-segment-id="${segmentId}"]` : '[data-current-match="true"]');
    if (el) {
      setSynced(false);
      scrollToCenter(scrollRef.current, el);
    }
  }, [current, matches, query, setSynced, editing, visible, scrollRef]);

  const replaceCurrent = () => {
    const match = matches[current];
    if (!match) return;
    const segment = visible[match.index];
    const text = replaceRange(segment.text, match.start, match.end, replaceValue);
    if (!text.trim()) return notify.error("That replacement would leave the segment empty.");
    updateSegment.mutate({ id: segment.id, changes: { text } }, { onSuccess: () => notify.success("Replaced 1 occurrence") });
  };
  const replaceEverywhere = () =>
    replaceAll.mutate({
      find: query.trim(),
      replace: replaceValue,
      case_sensitive: false,
      segment_ids: filtered ? visible.map((s) => s.id) : null, // with a filter on, only touch what is shown
    });

  /** Props for <TranscriptSearch>; Replace controls appear only in edit mode. */
  const searchProps = {
    value: input,
    onChange: (value: string) => {
      setInput(value);
      setMatchPosition(0);
    },
    total: matches.length,
    current,
    onStep: (delta: 1 | -1) => setMatchPosition(stepIndex(current, delta, matches.length)),
    onClear: () => {
      setInput("");
      setMatchPosition(0);
    },
    replace: editing
      ? {
          value: replaceValue,
          onChange: setReplaceValue,
          onReplace: replaceCurrent,
          onReplaceAll: replaceEverywhere,
          pending: updateSegment.isPending || replaceAll.isPending,
        }
      : undefined,
  };

  return { searchProps, current, rangesBySegment };
}

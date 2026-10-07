"use client";

import { ChevronUp, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useActiveSegmentIndex } from "@/components/player/hooks";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { pluralize } from "@/components/common/formatters";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useInsights } from "@/hooks/useMeeting";
import { useReassignSpeaker, useReplaceInTranscript, useUpdateSegment } from "@/hooks/useTranscriptEdit";
import type { PersonBrief, Segment } from "@/lib/api/types";
import { findMatches, replaceRange, stepIndex } from "@/lib/player/findMatches";
import { notify } from "@/lib/toast";

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
  editing: boolean;
  /** Meeting participants; combined with the people who already speak to form the speaker pickers. */
  participants: readonly PersonBrief[];
}

export function TranscriptPanel({ meetingId, segments, editing, participants }: TranscriptPanelProps) {
  const { filter, setFilter, toggleFilter } = useTranscriptFilter();
  const { data: insights } = useInsights(meetingId);
  const seekTo = useSeekTo();
  const { setSynced } = useTranscriptSync();
  const scrollRef = useRef<HTMLDivElement>(null);
  const updateSegment = useUpdateSegment(meetingId);
  const replaceAll = useReplaceInTranscript(meetingId);
  const reassign = useReassignSpeaker(meetingId);
  const [replaceValue, setReplaceValue] = useState("");
  const [pendingReassign, setPendingReassign] = useState<{ from: PersonBrief; to: PersonBrief } | null>(null);

  const speakers = useMemo(() => {
    const byId = new Map<number, PersonBrief>();
    for (const person of participants) byId.set(person.id, person);
    for (const segment of segments) if (!byId.has(segment.speaker.id)) byId.set(segment.speaker.id, segment.speaker);
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [participants, segments]);

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
    // Outside edit mode the current <mark> is centred; in edit mode (textareas) the whole segment is.
    const segmentId = visible[matches[current]?.index]?.id;
    const el = scrollRef.current.querySelector<HTMLElement>(editing ? `[data-segment-id="${segmentId}"]` : '[data-current-match="true"]');
    if (el) {
      setSynced(false);
      scrollToCenter(scrollRef.current, el);
    }
  }, [current, matches, query, setSynced, editing, visible]);

  const clearSearch = () => {
    setInput("");
    setMatchPosition(0);
  };
  const step = (delta: 1 | -1) => setMatchPosition(stepIndex(current, delta, matches.length));

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
      segment_ids: filter ? visible.map((s) => s.id) : null, // with a filter on, only touch what is shown
    });

  const onChangeSpeaker = useCallback(
    (segmentId: number, person: PersonBrief) => updateSegment.mutate({ id: segmentId, changes: { speaker_id: person.id } }),
    [updateSegment.mutate], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const onReassignAll = useCallback((from: PersonBrief, to: PersonBrief) => setPendingReassign({ from, to }), []);
  const reassignCount = pendingReassign ? segments.filter((s) => s.speaker.id === pendingReassign.from.id).length : 0;

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
          replace={
            editing
              ? {
                  value: replaceValue,
                  onChange: setReplaceValue,
                  onReplace: replaceCurrent,
                  onReplaceAll: replaceEverywhere,
                  pending: updateSegment.isPending || replaceAll.isPending,
                }
              : undefined
          }
        />
        {editing && (
          <p className="mt-2 text-xs text-text-tertiary">
            Editing transcript. Changes save when you click away or press Ctrl/⌘ + Enter. Esc reverts a segment.
          </p>
        )}
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
              meetingId={meetingId}
              segment={segment}
              editing={editing}
              speakers={speakers}
              onChangeSpeaker={onChangeSpeaker}
              onReassignAll={onReassignAll}
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

      <ConfirmModal
        open={pendingReassign !== null}
        onOpenChange={(open) => !open && setPendingReassign(null)}
        title="Reassign segments?"
        confirmLabel="Reassign"
        pending={reassign.isPending}
        onConfirm={() =>
          pendingReassign &&
          reassign.mutate(
            { from_person_id: pendingReassign.from.id, to_person_id: pendingReassign.to.id, toName: pendingReassign.to.name },
            { onSuccess: () => setPendingReassign(null) },
          )
        }
      >
        {pendingReassign && (
          <p>
            All {pluralize(reassignCount, "segment")} by <strong className="font-semibold text-text-primary">{pendingReassign.from.name}</strong> will be
            attributed to <strong className="font-semibold text-text-primary">{pendingReassign.to.name}</strong>. Timestamps stay the same.
          </p>
        )}
      </ConfirmModal>

      {!synced && activeId !== null && (
        <Button onClick={resync} className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full shadow-popover">
          <ChevronUp aria-hidden="true" /> Sync with audio
        </Button>
      )}
    </div>
  );
}

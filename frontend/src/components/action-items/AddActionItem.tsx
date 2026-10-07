"use client";

import { CalendarDays, CalendarPlus, Link2, Plus, UserRound, X } from "lucide-react";
import { useMemo, useState } from "react";

import { PersonAvatar } from "@/components/common/PersonAvatar";
import { SubmitButton } from "@/components/common/SubmitButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePlayerEngine } from "@/components/player/hooks";
import { useCreateActionItem } from "@/hooks/useActionItems";
import type { PersonBrief, Segment } from "@/lib/api/types";
import { formatDueDate } from "@/lib/dates";
import { findActiveIndex } from "@/lib/player/activeSegment";
import { formatClock } from "@/lib/player/timeFormat";

import { AssigneePicker } from "./AssigneePicker";
import { DueDatePicker } from "./DueDatePicker";

interface AddActionItemProps {
  meetingId: number;
  segments: Segment[];
}

/**
 * "+ Add action item" row. Enter saves. When the player is past 0:00 the new item is linked to the segment
 * playing right now (shown as a removable "linked to mm:ss" chip), so the time link points at what was said.
 */
export function AddActionItem({ meetingId, segments }: AddActionItemProps) {
  const engine = usePlayerEngine();
  const create = useCreateActionItem(meetingId);
  const starts = useMemo(() => segments.map((s) => s.start_ms), [segments]);

  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [assignee, setAssignee] = useState<PersonBrief | null>(null);
  const [due, setDue] = useState<string | null>(null);
  const [linkedId, setLinkedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const segmentAtPlayhead = (): Segment | null => {
    const time = engine.getTime();
    if (time <= 0) return null;
    const index = findActiveIndex(starts, time);
    return index >= 0 ? segments[index] : null;
  };

  const begin = () => {
    setLinkedId(segmentAtPlayhead()?.id ?? null);
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    setText("");
    setAssignee(null);
    setDue(null);
    setError(null);
  };

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return setError("Enter what needs to be done.");
    create.mutate(
      { text: trimmed, assignee_id: assignee?.id ?? null, due_date: due, source_segment_id: linkedId, is_completed: false },
      {
        onSuccess: () => {
          setText("");
          setError(null);
          setLinkedId(segmentAtPlayhead()?.id ?? null);
        },
      },
    );
  };

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={begin} className="mt-3 -ml-2 text-text-secondary">
        <Plus aria-hidden="true" /> Add action item
      </Button>
    );
  }

  const linked = linkedId === null ? null : segments.find((s) => s.id === linkedId);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      onKeyDown={(event) => event.key === "Escape" && !create.isPending && (event.stopPropagation(), close())}
      className="mt-3 rounded-lg border border-border bg-surface p-3 shadow-card"
      aria-label="Add action item"
    >
      <Input
        autoFocus
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          if (error) setError(null);
        }}
        placeholder="What needs to be done?"
        aria-label="Action item text"
        aria-invalid={error ? true : undefined}
        maxLength={1000}
        readOnly={create.isPending} // not disabled: that would drop focus and break Esc / typing the next item
      />
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <AssigneePicker
          meetingId={meetingId}
          value={assignee}
          onChange={setAssignee}
          triggerLabel="Choose assignee"
          triggerClassName="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[13px] text-text-secondary hover:bg-surface-hover"
        >
          {assignee ? (
            <>
              <PersonAvatar name={assignee.name} color={assignee.avatar_color} size="xs" /> {assignee.name}
            </>
          ) : (
            <>
              <UserRound className="size-3.5" aria-hidden="true" /> Unassigned
            </>
          )}
        </AssigneePicker>
        <DueDatePicker
          value={due}
          onChange={setDue}
          triggerLabel="Choose due date"
          triggerClassName="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[13px] text-text-secondary hover:bg-surface-hover"
        >
          {due ? <CalendarDays className="size-3.5" aria-hidden="true" /> : <CalendarPlus className="size-3.5" aria-hidden="true" />}
          {due ? formatDueDate(due) : "Due date"}
        </DueDatePicker>
        {linked && (
          <span className="flex items-center gap-1 rounded-full bg-info-soft py-1 pr-1 pl-2 text-xs text-info">
            <Link2 className="size-3" aria-hidden="true" /> linked to {formatClock(linked.start_ms)}
            <button type="button" aria-label="Remove link to transcript" onClick={() => setLinkedId(null)} className="rounded-full p-0.5 hover:bg-info/10">
              <X className="size-3" aria-hidden="true" />
            </button>
          </span>
        )}
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={close} disabled={create.isPending}>
            Done
          </Button>
          <SubmitButton type="submit" size="sm" pending={create.isPending}>
            Add
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}

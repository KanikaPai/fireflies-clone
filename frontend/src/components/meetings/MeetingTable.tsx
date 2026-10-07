"use client";

import { useMemo } from "react";

import { formatWeekRange, pluralize, weekKey } from "@/components/common/formatters";
import { Checkbox } from "@/components/ui/checkbox";
import type { MeetingListItem } from "@/lib/api/types";
import { cn } from "@/lib/utils";

import { MEETING_GRID, MeetingRow } from "./MeetingRow";

interface MeetingTableProps {
  meetings: MeetingListItem[];
  selectedIds: Set<number>;
  onSelectedIdsChange: (ids: Set<number>) => void;
  onRename: (meeting: MeetingListItem) => void;
  onDelete: (meeting: MeetingListItem) => void;
}

interface WeekGroup {
  key: string;
  label: string;
  meetings: MeetingListItem[];
}

/** Meetings are already sorted by date, so weeks come out contiguous. */
function groupByWeek(meetings: MeetingListItem[]): WeekGroup[] {
  const groups: WeekGroup[] = [];
  for (const meeting of meetings) {
    const key = weekKey(meeting.meeting_date);
    const last = groups.at(-1);
    if (last?.key === key) last.meetings.push(meeting);
    else groups.push({ key, label: formatWeekRange(meeting.meeting_date), meetings: [meeting] });
  }
  return groups;
}

export function MeetingTable({ meetings, selectedIds, onSelectedIdsChange, onRename, onDelete }: MeetingTableProps) {
  const groups = useMemo(() => groupByWeek(meetings), [meetings]);
  const allSelected = meetings.length > 0 && meetings.every((m) => selectedIds.has(m.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggle = (id: number, selected: boolean) => {
    const next = new Set(selectedIds);
    if (selected) next.add(id);
    else next.delete(id);
    onSelectedIdsChange(next);
  };

  return (
    <div role="table" aria-label="Meetings">
      <div role="row" className={cn(MEETING_GRID, "sticky top-0 z-10 h-11 border-b border-border bg-surface px-6 text-[11px] font-medium tracking-wider text-text-tertiary uppercase")}>
        <Checkbox
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          onCheckedChange={(value) => onSelectedIdsChange(value === true ? new Set(meetings.map((m) => m.id)) : new Set())}
          aria-label="Select all meetings"
        />
        <span role="columnheader">Meeting</span>
        <span role="columnheader" className="hidden md:block">Date</span>
        <span role="columnheader" className="hidden lg:block">Time</span>
        <span role="columnheader" className="text-right md:text-left">Duration</span>
        <span aria-hidden="true" />
      </div>

      {groups.map((group) => (
        <section key={group.key} aria-label={group.label}>
          <h2 className="flex items-baseline gap-2 border-b border-border px-6 pt-8 pb-4 font-sans text-base font-medium text-text-primary">
            {group.label}
            <span className="text-sm font-normal text-text-tertiary">· {pluralize(group.meetings.length, "Meeting")}</span>
          </h2>
          <ul>
            {group.meetings.map((meeting) => (
              <MeetingRow
                key={meeting.id}
                meeting={meeting}
                selected={selectedIds.has(meeting.id)}
                onSelectedChange={(selected) => toggle(meeting.id, selected)}
                onRename={onRename}
                onDelete={onDelete}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

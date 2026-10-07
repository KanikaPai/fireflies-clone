"use client";

import { Check, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";

import { PersonAvatar } from "@/components/common/PersonAvatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMeeting } from "@/hooks/useMeeting";
import type { PersonBrief } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface AssigneePickerProps {
  meetingId: number;
  value: PersonBrief | null;
  onChange: (person: PersonBrief | null) => void;
  /** The trigger's content; it is wrapped in a button. */
  children: ReactNode;
  triggerClassName?: string;
  triggerLabel: string;
}

/** Popover to choose one of the meeting's participants (or Unassigned). Participants load when it opens. */
export function AssigneePicker({ meetingId, value, onChange, children, triggerClassName, triggerLabel }: AssigneePickerProps) {
  const [open, setOpen] = useState(false);
  const meeting = useMeeting(meetingId, open);

  const people: PersonBrief[] = [...(meeting.data?.participants ?? [])];
  if (value && !people.some((p) => p.id === value.id)) people.unshift(value); // keep a removed participant selectable

  const choose = (person: PersonBrief | null) => {
    setOpen(false);
    if ((person?.id ?? null) !== (value?.id ?? null)) onChange(person);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={triggerLabel} className={triggerClassName}>
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 gap-0.5 p-1">
        <ul role="listbox" aria-label="Assign to">
          <Option selected={value === null} onSelect={() => choose(null)}>
            <span className="flex size-6 items-center justify-center rounded-full border border-dashed border-border-strong text-text-tertiary">
              <UserRound className="size-3.5" aria-hidden="true" />
            </span>
            Unassigned
          </Option>
          {meeting.isPending && <li className="px-2 py-2 text-sm text-text-tertiary">Loading…</li>}
          {people.map((person) => (
            <Option key={person.id} selected={value?.id === person.id} onSelect={() => choose(person)}>
              <PersonAvatar name={person.name} color={person.avatar_color} size="sm" />
              {person.name}
            </Option>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function Option({ selected, onSelect, children }: { selected: boolean; onSelect: () => void; children: ReactNode }) {
  return (
    <li role="option" aria-selected={selected}>
      <button
        type="button"
        onClick={onSelect}
        className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-text-primary hover:bg-surface-hover", selected && "font-medium")}
      >
        {children}
        {selected && <Check className="ml-auto size-4 text-brand" aria-hidden="true" />}
      </button>
    </li>
  );
}

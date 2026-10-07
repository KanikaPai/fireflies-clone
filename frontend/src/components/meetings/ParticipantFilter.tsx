"use client";

import { Check, Users } from "lucide-react";
import { useState } from "react";

import { PersonAvatar } from "@/components/common/PersonAvatar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { usePeople } from "@/hooks/usePeople";
import { cn } from "@/lib/utils";

import { FilterChip } from "./FilterChip";

interface ParticipantFilterProps {
  value: number | null;
  onChange: (id: number | null) => void;
}

export function ParticipantFilter({ value, onChange }: ParticipantFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: people, isPending, error } = usePeople();

  const selected = people?.find((p) => p.id === value);
  const visible = (people ?? []).filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <FilterChip icon={Users} label={selected ? selected.name : "Participant"} active={value !== null} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 gap-0 p-0 shadow-popover">
        <div className="border-b border-border p-2">
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people"
            aria-label="Search people"
            className="h-8 border-transparent bg-surface-subtle shadow-none"
          />
        </div>
        <ul className="max-h-64 overflow-y-auto p-1" aria-label="People">
          {isPending && (
            <li className="space-y-2 p-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </li>
          )}
          {error && <li className="px-3 py-2 text-sm text-danger">Couldn&apos;t load people</li>}
          {!isPending && !error && visible.length === 0 && <li className="px-3 py-2 text-sm text-text-tertiary">No people found</li>}
          {visible.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(person.id === value ? null : person.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-hover",
                  person.id === value && "bg-brand-soft",
                )}
              >
                <PersonAvatar name={person.name} color={person.avatar_color} size="sm" />
                <span className="flex-1 truncate text-text-primary">{person.name}</span>
                {person.id === value && <Check className="size-4 text-brand" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

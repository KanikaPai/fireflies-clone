"use client";

import { Check, Clock } from "lucide-react";
import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DURATION_LABELS, type DurationPreset } from "@/lib/meetingFilters";
import { cn } from "@/lib/utils";

import { FilterChip } from "./FilterChip";

interface DurationFilterProps {
  value: DurationPreset | null;
  onChange: (value: DurationPreset | null) => void;
}

export function DurationFilter({ value, onChange }: DurationFilterProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FilterChip icon={Clock} label={value ? DURATION_LABELS[value] : "Duration"} active={value !== null} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 gap-0 p-1 shadow-popover">
        <ul aria-label="Duration presets">
          {(Object.keys(DURATION_LABELS) as DurationPreset[]).map((preset) => (
            <li key={preset}>
              <button
                type="button"
                onClick={() => {
                  onChange(value === preset ? null : preset);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-surface-hover",
                  value === preset && "bg-brand-soft font-medium text-brand-soft-foreground",
                )}
              >
                {DURATION_LABELS[preset]}
                {value === preset && <Check className="size-4" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

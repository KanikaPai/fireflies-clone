"use client";

import { format, parseISO } from "date-fns";
import { CalendarDays, Check } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DATE_RANGE_LABELS, type DateRangePreset } from "@/lib/meetingFilters";
import { cn } from "@/lib/utils";

import { FilterChip } from "./FilterChip";

interface DateRangeFilterProps {
  range: DateRangePreset | null;
  from: string | null;
  to: string | null;
  onChange: (value: { range: DateRangePreset | null; from: string | null; to: string | null }) => void;
}

const fmt = (iso: string) => format(parseISO(iso), "MMM d");

function labelFor({ range, from, to }: Pick<DateRangeFilterProps, "range" | "from" | "to">): string {
  if (!range) return "Date Range";
  if (range !== "custom") return DATE_RANGE_LABELS[range];
  if (from && to) return `${fmt(from)} - ${fmt(to)}`;
  if (from) return `From ${fmt(from)}`;
  if (to) return `Until ${fmt(to)}`;
  return "Custom";
}

export function DateRangeFilter({ range, from, to, onChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(range === "custom");
  const [draft, setDraft] = useState<DateRange | undefined>(
    from ? { from: parseISO(from), to: to ? parseISO(to) : undefined } : undefined,
  );

  const choose = (preset: DateRangePreset | null) => {
    onChange({ range: preset, from: null, to: null });
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setCustom(range === "custom");
      }}
    >
      <PopoverTrigger asChild>
        <FilterChip icon={CalendarDays} label={labelFor({ range, from, to })} active={range !== null} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto gap-0 p-0 shadow-popover">
        <ul className="w-52 p-1" aria-label="Date range presets">
          {(["7d", "30d"] as const).map((preset) => (
            <li key={preset}>
              <PresetButton selected={range === preset} onClick={() => choose(preset)}>
                {DATE_RANGE_LABELS[preset]}
              </PresetButton>
            </li>
          ))}
          <li>
            <PresetButton selected={range === "custom"} onClick={() => setCustom(true)}>
              {DATE_RANGE_LABELS.custom}
            </PresetButton>
          </li>
        </ul>
        {custom && (
          <div className="border-t border-border p-2">
            <Calendar mode="range" selected={draft} onSelect={setDraft} numberOfMonths={1} disabled={{ after: new Date() }} />
            <div className="flex justify-end gap-2 px-2 pb-1">
              <Button variant="ghost" size="sm" onClick={() => choose(null)}>
                Clear
              </Button>
              <Button
                size="sm"
                disabled={!draft?.from}
                onClick={() => {
                  if (!draft?.from) return;
                  onChange({
                    range: "custom",
                    from: format(draft.from, "yyyy-MM-dd"),
                    to: format(draft.to ?? draft.from, "yyyy-MM-dd"),
                  });
                  setOpen(false);
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function PresetButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-surface-hover", selected && "bg-brand-soft font-medium text-brand-soft-foreground")}
    >
      {children}
      {selected && <Check className="size-4" aria-hidden="true" />}
    </button>
  );
}

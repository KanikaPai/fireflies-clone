"use client";

import { parseISO } from "date-fns";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toDateString } from "@/lib/dates";

interface DueDatePickerProps {
  /** "yyyy-MM-dd" or null. */
  value: string | null;
  onChange: (value: string | null) => void;
  children: ReactNode;
  triggerClassName?: string;
  triggerLabel: string;
}

/** Calendar popover for a due date, with a Clear button. */
export function DueDatePicker({ value, onChange, children, triggerClassName, triggerLabel }: DueDatePickerProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={triggerLabel} className={triggerClassName}>
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-1">
        <Calendar
          mode="single"
          selected={value ? parseISO(value) : undefined}
          defaultMonth={value ? parseISO(value) : undefined}
          onSelect={(date) => {
            setOpen(false);
            if (date) onChange(toDateString(date));
          }}
        />
        {value && (
          <Button
            variant="ghost"
            size="sm"
            className="mx-1 mb-1 text-text-secondary"
            onClick={() => {
              setOpen(false);
              onChange(null);
            }}
          >
            Clear due date
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

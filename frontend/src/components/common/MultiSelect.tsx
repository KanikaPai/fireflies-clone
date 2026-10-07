"use client";

import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { useId, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  id: number;
  label: string;
  /** Rendered before the label (avatar, colour dot). */
  leading?: ReactNode;
}

interface MultiSelectProps {
  id?: string;
  options: MultiSelectOption[];
  value: number[];
  onChange: (ids: number[]) => void;
  placeholder: string;
  searchPlaceholder: string;
  /** When set, typing a name with no exact match offers “+ Add '<name>'”. Resolve with the new option's id. */
  onCreate?: (name: string) => Promise<number | null>;
  creating?: boolean;
  disabled?: boolean;
}

/**
 * Searchable multi-select in a popover: chips for the selection, a filter box, ↑/↓/Enter to toggle, and an
 * optional inline “+ Add” that creates the entity and selects it.
 */
export function MultiSelect({
  id,
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  onCreate,
  creating,
  disabled,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();

  const selected = useMemo(() => new Set(value), [value]);
  const trimmed = query.trim();
  const filtered = useMemo(
    () => options.filter((option) => option.label.toLowerCase().includes(trimmed.toLowerCase())),
    [options, trimmed],
  );
  const canCreate = Boolean(onCreate) && trimmed.length > 0 && !options.some((o) => o.label.toLowerCase() === trimmed.toLowerCase());
  const rowCount = filtered.length + (canCreate ? 1 : 0);

  const toggle = (optionId: number) =>
    onChange(selected.has(optionId) ? value.filter((v) => v !== optionId) : [...value, optionId]);

  const create = async () => {
    if (!onCreate || !canCreate || creating) return;
    const newId = await onCreate(trimmed);
    if (newId !== null) {
      onChange([...value, newId]);
      setQuery("");
    }
  };

  const activate = (index: number) => {
    if (index < filtered.length) toggle(filtered[index].id);
    else void create();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, rowCount - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault(); // never submit the surrounding form from the search box
      event.stopPropagation();
      if (rowCount > 0) activate(Math.min(active, rowCount - 1));
    }
  };

  const chosen = options.filter((option) => selected.has(option.id));

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
        setActive(0);
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex min-h-9 w-full items-center gap-2 rounded-md border border-input bg-surface px-2 py-1 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
        >
          <span className="flex min-w-0 flex-1 flex-wrap gap-1">
            {chosen.length === 0 && <span className="px-1 text-text-tertiary">{placeholder}</span>}
            {chosen.map((option) => (
              <span
                key={option.id}
                className="inline-flex max-w-full items-center gap-1 rounded-full bg-brand-soft py-0.5 pr-1 pl-1.5 text-xs text-brand-soft-foreground"
              >
                {option.leading}
                <span className="truncate">{option.label}</span>
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={`Remove ${option.label}`}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggle(option.id);
                  }}
                  className="rounded-full p-0.5 hover:bg-brand/15"
                >
                  <X className="size-3" aria-hidden="true" />
                </span>
              </span>
            ))}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-text-tertiary" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) gap-1.5 p-1.5" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          aria-controls={listId}
          className="h-8"
        />
        <ul id={listId} role="listbox" aria-multiselectable="true" className="max-h-52 overflow-y-auto">
          {filtered.map((option, index) => (
            <li
              key={option.id}
              role="option"
              aria-selected={selected.has(option.id)}
              onMouseEnter={() => setActive(index)}
              onClick={() => toggle(option.id)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-text-primary",
                index === active && "bg-surface-hover",
              )}
            >
              {option.leading}
              <span className="flex-1 truncate">{option.label}</span>
              {selected.has(option.id) && <Check className="size-4 text-brand" aria-hidden="true" />}
            </li>
          ))}
          {canCreate && (
            <li
              role="option"
              aria-selected={false}
              onMouseEnter={() => setActive(filtered.length)}
              onClick={() => void create()}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-brand",
                active === filtered.length && "bg-surface-hover",
              )}
            >
              <Plus className="size-4" aria-hidden="true" />
              {creating ? "Adding…" : `Add “${trimmed}”`}
            </li>
          )}
          {rowCount === 0 && <li className="px-2 py-3 text-center text-sm text-text-tertiary">No matches</li>}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

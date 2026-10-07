"use client";

import { Check, Tag as TagIcon } from "lucide-react";
import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useTags } from "@/hooks/useTags";
import { cn } from "@/lib/utils";

import { FilterChip } from "./FilterChip";

interface TagFilterProps {
  value: number[];
  onChange: (ids: number[]) => void;
}

/** Multi-select tag filter ("Tags ▾"); meetings matching ANY selected tag are listed. */
export function TagFilter({ value, onChange }: TagFilterProps) {
  const [open, setOpen] = useState(false);
  const { data: tags, isPending, error } = useTags();

  const selectedTags = (tags ?? []).filter((tag) => value.includes(tag.id));
  const label = selectedTags.length === 0 ? "Tags" : selectedTags.length === 1 ? selectedTags[0].name : `${selectedTags.length} tags`;
  const toggle = (id: number) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FilterChip icon={TagIcon} label={label} active={value.length > 0} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 gap-0 p-0 shadow-popover">
        <ul className="max-h-64 overflow-y-auto p-1" aria-label="Tags">
          {isPending && (
            <li className="space-y-2 p-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </li>
          )}
          {error && <li className="px-3 py-2 text-sm text-danger">Couldn&apos;t load tags</li>}
          {!isPending && !error && (tags ?? []).length === 0 && <li className="px-3 py-2 text-sm text-text-tertiary">No tags yet</li>}
          {(tags ?? []).map((tag) => {
            const selected = value.includes(tag.id);
            return (
              <li key={tag.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  onClick={() => toggle(tag.id)}
                  className={cn("flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-hover", selected && "bg-brand-soft")}
                >
                  <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
                  <span className="flex-1 truncate text-text-primary">{tag.name}</span>
                  {selected && <Check className="size-4 text-brand" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
        {value.length > 0 && (
          <div className="border-t border-border p-1">
            <button type="button" onClick={() => onChange([])} className="w-full rounded-md px-2 py-1.5 text-left text-sm font-medium text-brand hover:bg-surface-hover">
              Clear tags
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { ArrowDown, ArrowUp, Search, X } from "lucide-react";
import type { KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";

interface TranscriptSearchProps {
  value: string;
  onChange: (value: string) => void;
  /** Number of matches for the committed (debounced) query. */
  total: number;
  /** Zero-based index of the current match. */
  current: number;
  onStep: (delta: 1 | -1) => void;
  onClear: () => void;
}

/** "Find or Replace" box: Find works now (highlight, count, next/previous); Replace arrives in Phase 5. */
export function TranscriptSearch({ value, onChange, total, current, onStep, onClear }: TranscriptSearchProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onStep(event.shiftKey ? -1 : 1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClear();
    }
  };
  const hasQuery = value.trim().length > 0;

  return (
    <div role="search" className="relative flex items-center gap-1 rounded-md bg-surface-subtle px-3 focus-within:ring-2 focus-within:ring-ring/40">
      <Search className="size-4 shrink-0 text-text-tertiary" aria-hidden="true" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Find or Replace"
        aria-label="Find in transcript"
        className="h-10 min-w-0 flex-1 bg-transparent px-1 text-sm text-text-primary outline-none placeholder:text-text-tertiary"
      />
      {hasQuery && (
        <>
          <span className="shrink-0 text-xs text-text-secondary tabular-nums" aria-live="polite">
            {total > 0 ? `${current + 1} of ${total}` : "No results"}
          </span>
          <Button variant="ghost" size="icon-xs" aria-label="Previous match" disabled={total === 0} onClick={() => onStep(-1)}>
            <ArrowUp aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon-xs" aria-label="Next match" disabled={total === 0} onClick={() => onStep(1)}>
            <ArrowDown aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon-xs" aria-label="Clear search" onClick={onClear}>
            <X aria-hidden="true" />
          </Button>
        </>
      )}
    </div>
  );
}

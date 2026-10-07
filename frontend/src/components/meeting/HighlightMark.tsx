"use client";

import { X } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

/** What the transcript text can do with a highlight; provided by TranscriptPanel (null when read-only). */
export const HighlightActionsContext = createContext<{ remove: (highlightId: number) => void } | null>(null);

const HIDE_DELAY_MS = 180;

/**
 * A user highlight over part of a segment's text. Hovering (or focusing) it shows a small "Remove highlight"
 * action. The action is portalled to <body> and positioned from the span's rectangle, so it is never part of
 * the transcript text (selection offsets and copy stay exact).
 */
export function HighlightMark({ id, children }: { id: number; children: ReactNode }) {
  const actions = useContext(HighlightActionsContext);
  const ref = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const show = () => {
    clearTimeout(timer.current);
    const rect = ref.current?.getBoundingClientRect();
    if (rect) setAnchor({ x: rect.left + rect.width / 2, y: rect.top });
  };
  const hideSoon = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAnchor(null), HIDE_DELAY_MS);
  };

  return (
    <span
      ref={ref}
      data-highlight-id={id}
      onMouseEnter={actions ? show : undefined}
      onMouseLeave={actions ? hideSoon : undefined}
      className="rounded-sm bg-highlight text-text-primary"
    >
      {children}
      {anchor &&
        actions &&
        createPortal(
          <button
            type="button"
            onMouseEnter={show}
            onMouseLeave={hideSoon}
            onClick={(event) => {
              event.stopPropagation();
              setAnchor(null);
              actions.remove(id);
            }}
            style={{ left: anchor.x, top: anchor.y - 6 }}
            className={cn(
              "fixed z-50 flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-md border border-border bg-popover px-2 py-1",
              "text-xs font-medium whitespace-nowrap text-text-primary shadow-popover hover:bg-surface-hover",
            )}
          >
            <X className="size-3" aria-hidden="true" /> Remove highlight
          </button>,
          document.body,
        )}
    </span>
  );
}

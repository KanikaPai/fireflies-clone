"use client";

import { Copy, Highlighter, MessageSquarePlus } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { Button } from "@/components/ui/button";
import type { HighlightCreate } from "@/lib/api/types";
import { readSegmentSelection, type SegmentSelection } from "@/lib/selection";
import { notify } from "@/lib/toast";

interface SelectionToolbarProps {
  containerRef: RefObject<HTMLElement | null>;
  /** Authoritative text of a segment (selection offsets are computed against it). */
  textOf: (segmentId: number) => string | undefined;
  /** Highlighting is off while the transcript is being edited. */
  enabled: boolean;
  pending: boolean;
  onCreate: (body: HighlightCreate, done: () => void) => void;
}

interface Active {
  selection: SegmentSelection;
  x: number;
  y: number;
}

/**
 * A small floating toolbar over the selected text of one transcript segment: Highlight, Comment (opens a
 * textarea) and Copy. Positioned from the selection's rectangle with `position: fixed`.
 */
export function SelectionToolbar({ containerRef, textOf, enabled, pending, onCreate }: SelectionToolbarProps) {
  const [active, setActive] = useState<Active | null>(null);
  const [commenting, setCommenting] = useState(false);
  const [note, setNote] = useState("");
  const commentingRef = useRef(false);
  useEffect(() => {
    commentingRef.current = commenting; // read by the document listeners below
  }, [commenting]);

  const reset = useCallback(() => {
    setActive(null);
    setCommenting(false);
    setNote("");
    window.getSelection()?.removeAllRanges();
  }, []);

  const refresh = useCallback(() => {
    const root = containerRef.current;
    if (!root || !enabled || commentingRef.current) return;
    const found = readSegmentSelection(root, textOf);
    setActive(found && { selection: found.selection, x: found.rect.left + found.rect.width / 2, y: found.rect.top });
  }, [containerRef, enabled, textOf]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const afterPointer = () => setTimeout(refresh, 0); // let the browser finish updating the selection
    const onSelectionChange = () => {
      if (commentingRef.current) return;
      if (window.getSelection()?.isCollapsed) setActive(null);
    };
    root.addEventListener("mouseup", afterPointer);
    root.addEventListener("keyup", afterPointer);
    root.addEventListener("scroll", refresh, { passive: true });
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      root.removeEventListener("mouseup", afterPointer);
      root.removeEventListener("keyup", afterPointer);
      root.removeEventListener("scroll", refresh);
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, [containerRef, refresh]);

  if (!active || !enabled) return null;
  const { selection } = active;
  const range = { segment_id: selection.segmentId, start_char: selection.start, end_char: selection.end };

  return (
    <div
      role="toolbar"
      aria-label="Selection actions"
      onMouseDown={(event) => {
        if (!(event.target instanceof HTMLTextAreaElement)) event.preventDefault(); // keep the text selected
      }}
      style={{ left: Math.min(Math.max(active.x, 170), window.innerWidth - 170), top: active.y - 8 }}
      className="fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-popover p-1 shadow-popover"
    >
      {commenting ? (
        <form
          className="w-72 space-y-2 p-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!note.trim()) return;
            onCreate({ ...range, kind: "comment", note: note.trim() }, reset);
          }}
        >
          <p className="line-clamp-2 border-l-2 border-highlight-strong pl-2 text-xs text-text-secondary italic">“{selection.text}”</p>
          <textarea
            autoFocus
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") reset();
            }}
            maxLength={2000}
            rows={3}
            placeholder="Add a comment…"
            aria-label="Comment"
            className="w-full resize-none rounded-md border border-input bg-surface px-2.5 py-2 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={reset}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!note.trim() || pending}>
              Save
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-0.5">
          <ToolbarButton icon={Highlighter} label="Highlight" disabled={pending} onClick={() => onCreate({ ...range, kind: "highlight" }, reset)} />
          <ToolbarButton icon={MessageSquarePlus} label="Comment" onClick={() => setCommenting(true)} />
          <ToolbarButton
            icon={Copy}
            label="Copy"
            onClick={() => {
              void navigator.clipboard?.writeText(selection.text).then(
                () => notify.success("Copied to clipboard"),
                () => notify.error("Could not copy"),
              );
              reset();
            }}
          />
        </div>
      )}
    </div>
  );
}

function ToolbarButton({ icon: Icon, label, onClick, disabled }: { icon: typeof Copy; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Button type="button" variant="ghost" size="sm" onClick={onClick} disabled={disabled} className="gap-1.5 px-2 text-text-primary">
      <Icon className="size-4" aria-hidden="true" /> {label}
    </Button>
  );
}

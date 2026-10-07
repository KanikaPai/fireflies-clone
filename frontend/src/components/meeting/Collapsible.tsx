"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/** A left-panel section: small-caps heading with a chevron that collapses the body. */
export function CollapsibleSection({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const id = useId();
  return (
    <section className="border-b border-border px-4 py-4 last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded text-[11px] font-medium tracking-wider text-text-tertiary uppercase"
      >
        {title}
        <ChevronDown className={cn("size-4 transition-transform", !open && "-rotate-90")} aria-hidden="true" />
      </button>
      {open && (
        <div id={id} className="mt-3">
          {children}
        </div>
      )}
    </section>
  );
}

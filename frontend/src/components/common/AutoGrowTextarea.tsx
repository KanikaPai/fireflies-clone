"use client";

import { useLayoutEffect, useRef, type ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** A textarea that grows with its content (no scrollbars, no manual resize). */
export function AutoGrowTextarea({ className, value, ...props }: Omit<ComponentProps<"textarea">, "ref">) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      className={cn(
        "block w-full resize-none overflow-hidden rounded-md border border-input bg-surface px-2 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
        className,
      )}
      {...props}
    />
  );
}

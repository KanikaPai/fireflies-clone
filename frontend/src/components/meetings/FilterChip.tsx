import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { forwardRef, type ComponentProps } from "react";

import { cn } from "@/lib/utils";

interface FilterChipProps extends ComponentProps<"button"> {
  icon: LucideIcon;
  label: string;
  active?: boolean;
}

/** Trigger button for a filter popover ("Participant ▾"); tinted purple when a value is selected. */
export const FilterChip = forwardRef<HTMLButtonElement, FilterChipProps>(function FilterChip(
  { icon: Icon, label, active, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm transition-colors hover:bg-surface-hover aria-expanded:bg-surface-hover",
        active ? "bg-brand-soft font-medium text-brand-soft-foreground hover:bg-brand-soft-hover" : "text-text-secondary",
        className,
      )}
      {...props}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="max-w-40 truncate">{label}</span>
      <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
    </button>
  );
});

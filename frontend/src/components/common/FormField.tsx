import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  /** Inline validation message; announced to screen readers. */
  error?: string | null;
  hint?: string;
  children: ReactNode;
  className?: string;
}

/** Label + control + inline validation message, as used by every form and modal. */
export function FormField({ label, htmlFor, error, hint, children, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-text-primary">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-text-tertiary">{hint}</p>
      )}
    </div>
  );
}

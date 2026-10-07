import { Check, Loader2, X } from "lucide-react";

import type { MeetingStatus } from "@/lib/api/types";
import { stepsFor, type StepState } from "@/lib/processing";
import { cn } from "@/lib/utils";

const ICON_STYLE: Record<StepState, string> = {
  done: "bg-success-soft text-success",
  active: "bg-warning-soft text-warning",
  failed: "bg-danger-soft text-danger",
  pending: "bg-surface-subtle text-text-tertiary",
};

/** Uploaded ✓ → Transcript parsed ✓ → Generating notes… (spinner / ✓ / ✗). */
export function ProcessingSteps({ status }: { status: MeetingStatus }) {
  const steps = stepsFor(status);
  return (
    <ol aria-label="Processing steps" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
      {steps.map((step, index) => (
        <li key={step.key} className="flex items-center gap-2">
          <span className={cn("flex items-center gap-1.5", step.state === "failed" ? "text-danger" : step.state === "active" ? "text-text-primary" : "text-text-secondary")}>
            <span className={cn("flex size-4 items-center justify-center rounded-full", ICON_STYLE[step.state])}>
              {step.state === "done" && <Check className="size-2.5" strokeWidth={3} aria-hidden="true" />}
              {step.state === "active" && <Loader2 className="size-3 animate-spin" aria-hidden="true" />}
              {step.state === "failed" && <X className="size-2.5" strokeWidth={3} aria-hidden="true" />}
            </span>
            {step.label}
            <span className="sr-only">{step.state === "done" ? " (done)" : step.state === "active" ? " (in progress)" : " (failed)"}</span>
          </span>
          {index < steps.length - 1 && <span aria-hidden="true" className="h-px w-5 bg-border-strong" />}
        </li>
      ))}
    </ol>
  );
}

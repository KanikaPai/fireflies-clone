import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  /** Optional call to action, typically a purple <Button>. */
  action?: ReactNode;
  className?: string;
}

/** Fireflies-style empty state: icon in a soft circle, bold heading, gray subtext, optional button. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center", className)}>
      <span className="mb-5 flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
      {description && <p className="mt-2 text-sm leading-relaxed text-text-secondary">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

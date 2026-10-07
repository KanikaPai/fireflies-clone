import { Sparkles, type LucideIcon } from "lucide-react";

import { EmptyState } from "./EmptyState";

interface ComingSoonProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
}

/** Placeholder body for pages whose feature is not built yet. */
export function ComingSoon({ title, description, icon = Sparkles }: ComingSoonProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        icon={icon}
        title={`${title} is coming soon`}
        description={description ?? "We're working on this feature. Check back soon."}
      />
    </div>
  );
}

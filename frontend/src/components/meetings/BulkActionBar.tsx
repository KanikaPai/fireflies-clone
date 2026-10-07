import { Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { notify } from "@/lib/toast";

interface BulkActionBarProps {
  count: number;
  onClear: () => void;
}

/** Floating bar shown while rows are selected. The delete itself is wired up in Phase 5. */
export function BulkActionBar({ count, onClear }: BulkActionBarProps) {
  if (count === 0) return null;
  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-border bg-surface py-2 pr-2 pl-4 shadow-popover"
    >
      <span className="text-sm font-medium text-text-primary">{count} selected</span>
      <span aria-hidden="true" className="h-4 w-px bg-border-strong" />
      <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft hover:text-danger" onClick={() => notify.nextStep("Bulk delete")}>
        <Trash2 aria-hidden="true" />
        Delete
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label="Clear selection" onClick={onClear}>
        <X aria-hidden="true" />
      </Button>
    </div>
  );
}

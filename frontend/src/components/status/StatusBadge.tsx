import { AlertCircle, Loader2 } from "lucide-react";

import type { MeetingStatus } from "@/lib/api/types";

/** Small "Processing" / "Failed" badge for library rows; renders nothing for ready meetings. */
export function StatusBadge({ status }: { status: MeetingStatus }) {
  if (status === "processing") {
    return (
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning">
        <Loader2 className="size-3 animate-spin" aria-hidden="true" /> Processing
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-medium text-danger">
        <AlertCircle className="size-3" aria-hidden="true" /> Failed
      </span>
    );
  }
  return null;
}

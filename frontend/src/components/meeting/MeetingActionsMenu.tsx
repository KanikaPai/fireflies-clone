"use client";

import { Download, Ellipsis, FileText, Pencil, RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRegenerateNotes } from "@/hooks/useMeetingMutations";
import { notify } from "@/lib/toast";

/** The ⋯ menu next to the breadcrumb. Rename/Delete land in Phase 5; Download in Phase 7. */
export function MeetingActionsMenu({ meetingId }: { meetingId: number }) {
  const regenerate = useRegenerateNotes(meetingId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Meeting actions" className="text-text-secondary">
          <Ellipsis aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuItem onSelect={() => notify.nextStep("Rename")}>
          <Pencil aria-hidden="true" /> Rename
        </DropdownMenuItem>
        <DropdownMenuItem disabled={regenerate.isPending} onSelect={() => regenerate.mutate()}>
          <RefreshCw className={regenerate.isPending ? "animate-spin" : undefined} aria-hidden="true" />
          {regenerate.isPending ? "Regenerating…" : "Regenerate notes"}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Download aria-hidden="true" /> Download
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {["Transcript (.txt)", "Summary (.md)", "Audio"].map((label) => (
              <DropdownMenuItem key={label} onSelect={() => notify.comingSoon("Download")}>
                <FileText aria-hidden="true" /> {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => notify.nextStep("Delete")}>
          <Trash2 aria-hidden="true" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import { Download, Ellipsis, FileText, Pencil, RefreshCw, SlidersHorizontal, Trash2 } from "lucide-react";

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
import { useMeetingDialogs } from "@/components/meeting-actions/MeetingDialogs";
import { notify } from "@/lib/toast";

/** The ⋯ menu next to the breadcrumb. Download lands in Phase 7. */
export function MeetingActionsMenu() {
  const { open } = useMeetingDialogs();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Meeting actions" className="text-text-secondary">
          <Ellipsis aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuItem onSelect={() => open("rename")}>
          <Pencil aria-hidden="true" /> Rename
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => open("edit")}>
          <SlidersHorizontal aria-hidden="true" /> Edit details
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => open("regenerate")}>
          <RefreshCw aria-hidden="true" /> Regenerate notes
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
        <DropdownMenuItem variant="destructive" onSelect={() => open("delete")}>
          <Trash2 aria-hidden="true" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

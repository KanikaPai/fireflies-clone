"use client";

import { Download, Ellipsis, Pencil, RefreshCw, SlidersHorizontal, Trash2 } from "lucide-react";

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
import { DownloadMenuItems } from "@/components/meeting-actions/DownloadMenuItems";

/** The ⋯ menu next to the breadcrumb. */
export function MeetingActionsMenu({ meetingId }: { meetingId: number }) {
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
            <DownloadMenuItems meetingId={meetingId} />
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

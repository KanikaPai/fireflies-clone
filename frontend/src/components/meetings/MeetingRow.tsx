"use client";

import { CalendarDays, Clock, EllipsisVertical } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { formatDate, formatDuration, formatTime } from "@/components/common/formatters";
import { PersonAvatar } from "@/components/common/PersonAvatar";
import { SourceIcon } from "@/components/common/SourceIcon";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { MeetingListItem } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** Shared column template so header and rows line up. */
export const MEETING_GRID = "grid grid-cols-[28px_minmax(0,1fr)_auto_36px] items-center gap-x-4 md:grid-cols-[28px_minmax(0,1fr)_170px_100px_36px] lg:grid-cols-[28px_minmax(0,1fr)_170px_120px_100px_36px]";

interface MeetingRowProps {
  meeting: MeetingListItem;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
  onRename: (meeting: MeetingListItem) => void;
  onDelete: (meeting: MeetingListItem) => void;
}

export function MeetingRow({ meeting, selected, onSelectedChange, onRename, onDelete }: MeetingRowProps) {
  const router = useRouter();
  const organizer = meeting.participants[0]; // participants are returned host-first
  const href = `/meetings/${meeting.id}`;

  return (
    <li className={cn("group relative border-b border-border transition-colors hover:bg-surface-hover", selected && "bg-brand-soft/60 hover:bg-brand-soft/60")}>
      {/* The whole row is one link; interactive children sit above it (z-10). */}
      <Link href={href} className="absolute inset-0 z-0 rounded-sm" aria-label={`Open ${meeting.title}`} />
      <div className={cn(MEETING_GRID, "pointer-events-none relative min-h-[72px] px-6 py-3")}>
        <Checkbox
          checked={selected}
          onCheckedChange={(value) => onSelectedChange(value === true)}
          aria-label={`Select ${meeting.title}`}
          className={cn("pointer-events-auto relative z-10", !selected && "opacity-60 group-hover:opacity-100")}
        />

        <div className="flex min-w-0 items-center gap-3.5">
          {organizer ? (
            <PersonAvatar name={organizer.name} color={organizer.avatar_color} size="lg" />
          ) : (
            <PersonAvatar name="?" color="var(--text-tertiary)" size="lg" />
          )}
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium text-text-primary">{meeting.title}</p>
            <p className="mt-0.5 flex items-center gap-2 text-[13px] text-text-tertiary">
              <span className="truncate">{organizer?.name ?? "Unknown organizer"}</span>
              <span aria-hidden="true" className="h-3 w-px bg-border-strong" />
              <SourceIcon platform={meeting.platform} />
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-2 text-[13px] text-text-tertiary md:flex">
          <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
          {formatDate(meeting.meeting_date)}
        </div>
        <div className="hidden items-center gap-2 text-[13px] text-text-tertiary lg:flex">
          <Clock className="size-4 shrink-0" aria-hidden="true" />
          {formatTime(meeting.meeting_date)}
        </div>
        <div className="text-right text-[13px] text-text-tertiary md:text-left">{formatDuration(meeting.duration_seconds)}</div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${meeting.title}`}
              className="pointer-events-auto relative z-10 text-text-secondary opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
            >
              <EllipsisVertical aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onSelect={() => router.push(href)}>Open</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onRename(meeting)}>Rename</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(meeting)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

"use client";

import { format } from "date-fns";
import { ChevronDown, Info, Video, X } from "lucide-react";
import { useState } from "react";

import { PersonAvatar } from "@/components/common/PersonAvatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { MeetingDetail, Segment } from "@/lib/api/types";
import { cn } from "@/lib/utils";

import { useMeetingDialogs } from "@/components/meeting-actions/MeetingDialogs";

import { EditableTitle } from "./EditableTitle";
import { VideoPanel } from "./VideoPanel";

interface MeetingHeaderProps {
  meeting: MeetingDetail;
  segments: Segment[];
}

export function MeetingHeader({ meeting, segments }: MeetingHeaderProps) {
  const [showVideo, setShowVideo] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(true);
  const organizer = meeting.participants[0];
  const { open } = useMeetingDialogs();
  const others = meeting.participants.length - 1;

  return (
    <header>
      <EditableTitle meetingId={meeting.id} title={meeting.title} />
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-text-secondary">
        <button
          type="button"
          onClick={() => open("edit")}
          aria-label="Edit participants and date"
          className="-mx-1.5 flex items-center gap-3 rounded-md px-1.5 py-0.5 hover:bg-surface-hover"
        >
          {organizer && (
            <span className="flex items-center gap-2">
              <PersonAvatar name={organizer.name} color={organizer.avatar_color} size="sm" className="rounded-md" />
              <span className="text-text-primary underline underline-offset-2">{organizer.name}</span>
              {others > 0 && <span className="text-text-tertiary">+{others}</span>}
            </span>
          )}
          <time dateTime={meeting.meeting_date}>{format(new Date(meeting.meeting_date), "MMM dd yyyy, h:mm a")}</time>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 rounded text-text-secondary hover:text-text-primary">
            English (Global) <ChevronDown className="size-3.5" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuCheckboxItem checked>English (Global)</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={showVideo}
          onClick={() => setShowVideo((v) => !v)}
          className={cn("ml-auto border border-border text-text-secondary", showVideo && "bg-brand-soft text-brand")}
        >
          <Video aria-hidden="true" /> Video
        </Button>
      </div>

      {showVideo && (
        <div className="mt-4">
          <VideoPanel segments={segments} participants={meeting.participants} />
        </div>
      )}

      {bannerOpen && (
        <div role="status" className="mt-5 flex items-center gap-2.5 rounded-md bg-info-soft px-3 py-2.5 text-[13px] text-info">
          <Info className="size-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">Playback is simulated in this demo — no recording is attached.</span>
          <button type="button" aria-label="Dismiss" onClick={() => setBannerOpen(false)} className="rounded p-0.5 hover:bg-info/10">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </header>
  );
}

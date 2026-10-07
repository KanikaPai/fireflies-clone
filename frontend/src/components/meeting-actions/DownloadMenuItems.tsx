"use client";

import { FileText, Printer } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useDownloadMeeting } from "@/hooks/useDownloadMeeting";
import { DOWNLOAD_OPTIONS } from "@/lib/exportFormats";

/** The download choices, shared by the ⋯ menu submenu and the player bar's download menu. */
export function DownloadMenuItems({ meetingId }: { meetingId: number }) {
  const download = useDownloadMeeting(meetingId);
  return (
    <>
      {DOWNLOAD_OPTIONS.map(({ key, label }) => (
        <DropdownMenuItem key={key} onSelect={() => void download(key)}>
          {key === "pdf" ? <Printer aria-hidden="true" /> : <FileText aria-hidden="true" />} {label}
        </DropdownMenuItem>
      ))}
    </>
  );
}

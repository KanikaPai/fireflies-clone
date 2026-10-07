import { useCallback } from "react";

import { apiDownload } from "@/lib/api/client";
import { printPath, type DownloadKey } from "@/lib/exportFormats";
import { notify } from "@/lib/toast";

/** Save a Blob through a temporary link (the browser shows its normal download UI). */
function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Returns `download(key)`: fetches the export and saves it (with a toast), or opens the print view for PDF. */
export function useDownloadMeeting(meetingId: number) {
  return useCallback(
    async (key: DownloadKey) => {
      if (key === "pdf") {
        window.open(printPath(meetingId), "_blank", "noopener");
        notify.info("Opening the print view — choose Save as PDF");
        return;
      }
      try {
        const { blob, filename } = await apiDownload(`/api/meetings/${meetingId}/export`, { format: key });
        const name = filename ?? `meeting-${meetingId}.${key}`;
        saveBlob(blob, name);
        notify.success(`Downloaded ${name}`);
      } catch (error) {
        notify.error(error instanceof Error ? error.message : "Could not download the file");
      }
    },
    [meetingId],
  );
}

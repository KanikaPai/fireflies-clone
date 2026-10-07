"use client";

import { ClipboardPaste, FileText, Upload } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { AttachTranscriptModal } from "@/components/new-meeting/AttachTranscriptModal";
import { Button } from "@/components/ui/button";

/** Transcript column for a meeting created without a transcript. */
export function NoTranscript({ meetingId }: { meetingId: number }) {
  const [mode, setMode] = useState<"upload" | "paste" | null>(null);
  return (
    <>
      <EmptyState
        className="py-12"
        icon={FileText}
        title="No transcript yet"
        description="Upload or paste a transcript to read the conversation and generate a summary and action items."
        action={
          <div className="flex gap-2">
            <Button onClick={() => setMode("upload")}>
              <Upload aria-hidden="true" /> Upload
            </Button>
            <Button variant="outline" onClick={() => setMode("paste")}>
              <ClipboardPaste aria-hidden="true" /> Paste
            </Button>
          </div>
        }
      />
      <AttachTranscriptModal meetingId={meetingId} mode={mode} onOpenChange={(open) => !open && setMode(null)} />
    </>
  );
}

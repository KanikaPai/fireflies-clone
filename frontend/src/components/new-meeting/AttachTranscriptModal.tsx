"use client";

import { useState } from "react";

import { Modal } from "@/components/common/Modal";
import { SubmitButton } from "@/components/common/SubmitButton";
import { Button } from "@/components/ui/button";
import { useAttachTranscript } from "@/hooks/useCreateMeeting";

import { TranscriptInput, type ReadyTranscript } from "./TranscriptInput";

interface AttachTranscriptModalProps {
  meetingId: number;
  /** Which input to show; null closes the modal. */
  mode: "upload" | "paste" | null;
  onOpenChange: (open: boolean) => void;
}

/** Add a transcript to a meeting that has none: choose or paste, preview, then it is processed. */
export function AttachTranscriptModal({ meetingId, mode, onOpenChange }: AttachTranscriptModalProps) {
  return mode ? <AttachForm meetingId={meetingId} mode={mode} onOpenChange={onOpenChange} /> : null;
}

function AttachForm({ meetingId, mode, onOpenChange }: { meetingId: number; mode: "upload" | "paste"; onOpenChange: (open: boolean) => void }) {
  const attach = useAttachTranscript(meetingId);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [ready, setReady] = useState<ReadyTranscript | null>(null);

  return (
    <Modal
      open
      onOpenChange={(open) => !attach.isPending && onOpenChange(open)}
      title={mode === "upload" ? "Upload a transcript" : "Paste a transcript"}
      description="It will be parsed and summarised, and the meeting's speakers become participants."
      className="sm:max-w-[560px]"
      onSubmit={() => ready && attach.mutate(ready.source, { onSuccess: () => onOpenChange(false) })}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={attach.isPending}>
            Cancel
          </Button>
          <SubmitButton type="submit" pending={attach.isPending} disabled={!ready}>
            Add transcript
          </SubmitButton>
        </>
      }
    >
      <TranscriptInput mode={mode} file={file} onFileChange={setFile} text={text} onTextChange={setText} onReady={setReady} />
    </Modal>
  );
}

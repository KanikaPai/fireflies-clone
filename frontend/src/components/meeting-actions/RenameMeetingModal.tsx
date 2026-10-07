"use client";

import { useState } from "react";

import { FormField } from "@/components/common/FormField";
import { Modal } from "@/components/common/Modal";
import { SubmitButton } from "@/components/common/SubmitButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateMeeting } from "@/hooks/useMeetingMutations";
import { validateTitle } from "@/lib/validation";

interface RenameMeetingModalProps {
  meeting: { id: number; title: string } | null;
  onOpenChange: (open: boolean) => void;
}

/** Rename dialog (library row kebab and the meeting ⋯ menu). Mounted only while open so its state resets. */
export function RenameMeetingModal({ meeting, onOpenChange }: RenameMeetingModalProps) {
  return meeting ? <RenameForm meeting={meeting} onOpenChange={onOpenChange} /> : null;
}

function RenameForm({ meeting, onOpenChange }: { meeting: { id: number; title: string }; onOpenChange: (open: boolean) => void }) {
  const [title, setTitle] = useState(meeting.title);
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateMeeting(meeting.id, "Meeting renamed");

  const submit = () => {
    const problem = validateTitle(title);
    setError(problem);
    if (problem) return;
    if (title.trim() === meeting.title) return onOpenChange(false);
    update.mutate({ title: title.trim() }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Modal
      open
      onOpenChange={(open) => !update.isPending && onOpenChange(open)}
      title="Rename meeting"
      onSubmit={submit}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            Cancel
          </Button>
          <SubmitButton type="submit" pending={update.isPending}>
            Save
          </SubmitButton>
        </>
      }
    >
      <FormField label="Meeting title" htmlFor="rename-title" error={error}>
        <Input
          id="rename-title"
          value={title}
          autoFocus
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => {
            setTitle(event.target.value);
            if (error) setError(null);
          }}
          aria-invalid={error ? true : undefined}
          maxLength={300}
        />
      </FormField>
    </Modal>
  );
}

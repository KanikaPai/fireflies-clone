"use client";

import { Pencil } from "lucide-react";
import { useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { useUpdateMeeting } from "@/hooks/useMeetingMutations";
import { validateTitle } from "@/lib/validation";

/** The meeting H1: click to rename in place. Enter saves, Esc cancels, an empty title is rejected inline. */
export function EditableTitle({ meetingId, title }: { meetingId: number; title: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);
  const update = useUpdateMeeting(meetingId, "Meeting renamed");

  const begin = () => {
    cancelled.current = false;
    setDraft(title);
    setError(null);
    setEditing(true);
  };

  const commit = () => {
    if (cancelled.current || update.isPending) return;
    const problem = validateTitle(draft);
    if (problem) return setError(problem);
    if (draft.trim() === title) return setEditing(false);
    update.mutate({ title: draft.trim() }, { onSuccess: () => setEditing(false), onError: () => setEditing(false) });
  };

  if (!editing) {
    return (
      <h1 className="font-sans text-[26px] leading-tight font-medium text-text-primary">
        <button
          type="button"
          onClick={begin}
          aria-label={`Rename meeting: ${title}`}
          className="group -mx-2 flex max-w-full items-center gap-2 rounded-md px-2 py-0.5 text-left hover:bg-surface-hover"
        >
          <span className="min-w-0 break-words">{title}</span>
          <Pencil className="size-4 shrink-0 text-text-tertiary opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
        </button>
      </h1>
    );
  }

  return (
    <div>
      <Input
        autoFocus
        value={draft}
        aria-label="Meeting title"
        aria-invalid={error ? true : undefined}
        maxLength={300}
        disabled={update.isPending}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => {
          setDraft(event.target.value);
          if (error) setError(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          } else if (event.key === "Escape") {
            event.stopPropagation();
            cancelled.current = true;
            setEditing(false);
          }
        }}
        onBlur={commit}
        className="h-11 text-[22px] font-medium md:text-[22px]"
      />
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

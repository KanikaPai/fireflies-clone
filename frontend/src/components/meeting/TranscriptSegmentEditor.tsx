"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AutoGrowTextarea } from "@/components/common/AutoGrowTextarea";
import { useUpdateSegment } from "@/hooks/useTranscriptEdit";
import type { Segment } from "@/lib/api/types";

interface TranscriptSegmentEditorProps {
  meetingId: number;
  segment: Segment;
}

/**
 * Edit mode for one segment: an auto-growing textarea. Saves on blur or Cmd/Ctrl+Enter, Esc reverts, and a
 * subtle "Saved" tag confirms. Timings are never edited, so playback sync is unaffected.
 */
export function TranscriptSegmentEditor({ meetingId, segment }: TranscriptSegmentEditorProps) {
  const update = useUpdateSegment(meetingId);
  const [draft, setDraft] = useState(segment.text);
  const [seenText, setSeenText] = useState(segment.text);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const skipBlurSave = useRef(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The text can change underneath us (Replace all, another edit): follow it unless the user is typing.
  if (segment.text !== seenText) {
    setSeenText(segment.text);
    if (!focused) setDraft(segment.text);
  }

  useEffect(() => () => void (savedTimer.current && clearTimeout(savedTimer.current)), []);

  const save = () => {
    const next = draft.trim();
    if (!next) {
      setError("A segment can't be empty. Your change was not saved.");
      setDraft(segment.text);
      return;
    }
    if (next === segment.text) return setDraft(segment.text);
    setError(null);
    update.mutate(
      { id: segment.id, changes: { text: next } },
      {
        onSuccess: () => {
          setSaved(true);
          if (savedTimer.current) clearTimeout(savedTimer.current);
          savedTimer.current = setTimeout(() => setSaved(false), 2000);
        },
        onError: () => setDraft(segment.text),
      },
    );
  };

  return (
    <div className="mt-1.5 pl-7">
      <AutoGrowTextarea
        value={draft}
        aria-label={`Edit transcript text, ${segment.speaker.name}`}
        maxLength={5000}
        onChange={(event) => {
          setDraft(event.target.value);
          if (error) setError(null);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          if (skipBlurSave.current) skipBlurSave.current = false;
          else save();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            save();
          } else if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            skipBlurSave.current = true;
            setDraft(segment.text);
            setError(null);
            event.currentTarget.blur();
          }
        }}
        className="text-[15px] leading-[1.7] text-text-secondary"
      />
      <div className="mt-0.5 flex h-4 items-center gap-1 text-xs">
        {error ? (
          <span role="alert" className="text-danger">
            {error}
          </span>
        ) : update.isPending ? (
          <span className="text-text-tertiary">Saving…</span>
        ) : saved ? (
          <span className="flex items-center gap-1 text-success" aria-live="polite">
            <Check className="size-3" aria-hidden="true" /> Saved
          </span>
        ) : null}
      </div>
    </div>
  );
}

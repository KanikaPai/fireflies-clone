"use client";

import { useEffect, useMemo } from "react";

import { useParsePreview } from "@/hooks/useCreateMeeting";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { ParsePreview } from "@/lib/api/types";
import { EXAMPLE_TRANSCRIPT, validateFile, type TranscriptSource } from "@/lib/transcriptSource";

import { FileDropzone } from "./FileDropzone";
import { ParsePreviewCard } from "./ParsePreviewCard";

export interface ReadyTranscript {
  source: TranscriptSource;
  preview: ParsePreview;
}

interface TranscriptInputProps {
  mode: "upload" | "paste";
  file: File | null;
  onFileChange: (file: File | null) => void;
  text: string;
  onTextChange: (text: string) => void;
  /** Reports the parsed transcript once it parses cleanly, or null while there is nothing valid to submit. */
  onReady: (ready: ReadyTranscript | null) => void;
}

/** One pane of the transcript input (file dropzone or paste box) with a live dry-run preview underneath. */
export function TranscriptInput({ mode, file, onFileChange, text, onTextChange, onReady }: TranscriptInputProps) {
  const fileError = useMemo(() => (file ? validateFile(file) : null), [file]);
  const debouncedText = useDebouncedValue(text, 400);

  const source = useMemo<TranscriptSource | null>(() => {
    if (mode === "upload") return file && !fileError ? { kind: "file", file } : null;
    return debouncedText.trim() ? { kind: "text", text: debouncedText } : null;
  }, [mode, file, fileError, debouncedText]);

  const preview = useParsePreview(source);
  // While the user is still typing, the debounced text lags behind: not ready yet.
  const settled = mode === "upload" || debouncedText === text;
  const ready = source && preview.data && !preview.isFetching && settled ? { source, preview: preview.data } : null;

  useEffect(() => onReady(ready), [ready?.source, ready?.preview]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-3">
      {mode === "upload" ? (
        <FileDropzone file={file} onFile={onFileChange} error={fileError} compact />
      ) : (
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3 text-xs text-text-tertiary">
            <label htmlFor="paste-transcript">
              One line per turn: <code className="rounded bg-surface-subtle px-1">[mm:ss] Speaker Name: text</code>. WebVTT and JSON also work.
            </label>
            <button type="button" onClick={() => onTextChange(EXAMPLE_TRANSCRIPT)} className="shrink-0 font-medium text-brand hover:underline">
              Insert example
            </button>
          </div>
          <textarea
            id="paste-transcript"
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            rows={7}
            placeholder={"[00:00] Ana Lopez: Welcome everyone…\n[00:15] Ben Carter: Thanks, let's start."}
            className="w-full resize-y rounded-md border border-input bg-surface p-3 font-mono text-xs leading-relaxed outline-none placeholder:text-text-tertiary focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
      )}
      {source && <ParsePreviewCard data={preview.data} error={preview.error} loading={preview.isFetching || !settled} />}
    </div>
  );
}

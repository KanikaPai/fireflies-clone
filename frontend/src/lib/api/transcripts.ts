import type { TranscriptSource } from "@/lib/transcriptSource";

import { apiFetch } from "./client";
import type { ParsePreview } from "./types";

/** Multipart for a file, JSON for pasted text (both are accepted by the same endpoints). */
function sourceBody(source: TranscriptSource): { form: FormData } | { json: { text: string } } {
  if (source.kind === "text") return { json: { text: source.text } };
  const form = new FormData();
  form.append("file", source.file);
  return { form };
}

/** Dry run: nothing is saved. */
export const parseTranscript = (source: TranscriptSource, signal?: AbortSignal) =>
  apiFetch<ParsePreview>("/api/transcripts/parse", { method: "POST", signal, ...sourceBody(source) });

export const sourceRequest = sourceBody;

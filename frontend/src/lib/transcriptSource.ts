/** A transcript the user supplied: a chosen file or pasted text. */
export type TranscriptSource = { kind: "file"; file: File } | { kind: "text"; text: string };

export const ACCEPTED_EXTENSIONS = [".txt", ".vtt", ".json"] as const;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const hasAcceptedExtension = (name: string): boolean => ACCEPTED_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));

/** Client-side checks that mirror the API limits, so obvious mistakes are caught before any request. */
export function validateFile(file: File): string | null {
  if (!hasAcceptedExtension(file.name)) return `“${file.name}” isn't supported. Use a .txt, .vtt or .json transcript.`;
  if (file.size > MAX_UPLOAD_BYTES) return `“${file.name}” is ${formatBytes(file.size)}. The maximum is 5 MB.`;
  if (file.size === 0) return `“${file.name}” is empty.`;
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** "Weekly sync.vtt" -> "Weekly sync"; used as the default meeting title for an uploaded file. */
export const titleFromFileName = (name: string): string => name.replace(/\.[^./\\]+$/, "").replace(/[_-]+/g, " ").trim();

/** Cheap stable key for react-query (avoids putting a whole transcript in the query key). */
export function sourceKey(source: TranscriptSource): string {
  if (source.kind === "file") return `file:${source.file.name}:${source.file.size}:${source.file.lastModified}`;
  let hash = 5381;
  for (let i = 0; i < source.text.length; i++) hash = ((hash << 5) + hash + source.text.charCodeAt(i)) | 0;
  return `text:${source.text.length}:${hash}`;
}

/** Shown by "Insert example" in the paste tab. */
export const EXAMPLE_TRANSCRIPT = `[00:00] Maya Patel: Thanks for joining. Today we want to agree the launch plan for the new dashboard.
[00:12] Chris Lund: The beta feedback was positive. Three customers asked for CSV export before launch.
[00:31] Maya Patel: Good. Chris, can you scope the CSV export and share an estimate by Friday?
[00:44] Chris Lund: Yes, I'll send the estimate on Friday. We also need to update the pricing page.
[01:02] Priya Shah: I'll draft the pricing page copy and send it to design by Wednesday.
[01:20] Maya Patel: Great. Let's aim to launch on the fifteenth if the export is small enough.`;

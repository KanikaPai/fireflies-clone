export type ExportFormat = "txt" | "vtt" | "md" | "json";

/** Entries of the Download menu (meeting ⋯ menu and player bar). `pdf` opens the print view instead of a file. */
export const DOWNLOAD_OPTIONS = [
  { key: "txt", label: "Transcript (.txt)" },
  { key: "vtt", label: "Transcript (.vtt)" },
  { key: "md", label: "Notes + transcript (.md)" },
  { key: "json", label: "JSON" },
  { key: "pdf", label: "PDF (Print / Save as PDF)" },
] as const satisfies readonly { key: ExportFormat | "pdf"; label: string }[];

export type DownloadKey = (typeof DOWNLOAD_OPTIONS)[number]["key"];

export const printPath = (meetingId: number): string => `/meetings/${meetingId}/print`;

import { formatClock } from "@/lib/player/timeFormat";

interface SummarySource {
  title: string;
  summary: { bullets: { label: string; text: string }[]; keywords: string[] } | null;
  chapters: { title: string; summary: string | null; start_ms: number; points: { text: string; start_ms: number }[] }[];
}

/** Plain-text version of the summary + notes, for the copy button. */
export function summaryAsText(meeting: SummarySource): string {
  const lines: string[] = [meeting.title, ""];
  if (meeting.summary) {
    lines.push("Summary");
    for (const bullet of meeting.summary.bullets) lines.push(`- ${bullet.label}: ${bullet.text}`);
    if (meeting.summary.keywords.length) lines.push("", `Keywords: ${meeting.summary.keywords.join(", ")}`);
  }
  if (meeting.chapters.length) {
    lines.push("", "Notes");
    for (const chapter of meeting.chapters) {
      lines.push("", chapter.title);
      if (chapter.summary) lines.push(`${chapter.summary} (${formatClock(chapter.start_ms)})`);
      for (const point of chapter.points) lines.push(`- ${point.text} (${formatClock(point.start_ms)})`);
    }
  }
  return lines.join("\n").trim();
}

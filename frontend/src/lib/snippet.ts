/**
 * Search snippets arrive HTML-escaped from the server with matches wrapped in <mark>…</mark>. Instead of
 * injecting HTML we split on those two tags and decode the three escapes the server applies, so React only
 * ever renders text nodes and <mark> elements.
 */
export interface SnippetPart {
  text: string;
  mark: boolean;
}

const decode = (value: string): string => value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

export function parseSnippet(snippet: string): SnippetPart[] {
  const parts: SnippetPart[] = [];
  const pattern = /<mark>([\s\S]*?)<\/mark>/gi;
  let last = 0;
  for (const match of snippet.matchAll(pattern)) {
    if (match.index > last) parts.push({ text: decode(snippet.slice(last, match.index)), mark: false });
    parts.push({ text: decode(match[1]), mark: true });
    last = match.index + match[0].length;
  }
  if (last < snippet.length) parts.push({ text: decode(snippet.slice(last)), mark: false });
  return parts.filter((part) => part.text.length > 0);
}

/** The first highlighted word of a snippet (a literal that appears in the segment), else `fallback`. */
export const termFromSnippet = (snippet: string, fallback: string): string => parseSnippet(snippet).find((part) => part.mark)?.text ?? fallback;

/** Deep link into a meeting: seek to `startMs` (rounded up to the next second, so playback lands inside the segment) and pre-fill the transcript Find box with `term`. */
export function meetingSearchHref(meetingId: number, startMs: number | null, term?: string): string {
  const params = new URLSearchParams();
  if (startMs !== null) params.set("t", String(Math.ceil(startMs / 1000)));
  if (term?.trim()) params.set("q", term.trim());
  const query = params.toString();
  return `/meetings/${meetingId}${query ? `?${query}` : ""}`;
}

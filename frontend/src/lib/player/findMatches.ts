export interface TextMatch {
  /** Index into the searched list (i.e. the segment). */
  index: number;
  start: number;
  end: number;
}

export const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * All case-insensitive, non-overlapping occurrences of `query` in each text, in reading order.
 * Regex characters in the query are matched literally; an empty or whitespace-only query matches nothing.
 */
export function findMatches(texts: readonly string[], query: string): TextMatch[] {
  const needle = query.trim();
  if (!needle) return [];
  const pattern = new RegExp(escapeRegExp(needle), "gi");
  const matches: TextMatch[] = [];
  texts.forEach((text, index) => {
    for (const match of text.matchAll(pattern)) {
      matches.push({ index, start: match.index, end: match.index + match[0].length });
    }
  });
  return matches;
}

/** Wrap-around navigation: next(-1) from the first goes to the last. */
export const stepIndex = (current: number, delta: 1 | -1, total: number): number =>
  total === 0 ? 0 : (current + delta + total) % total;

/** `text` with the range [start, end) swapped for `replacement` (used by "Replace" on the current match). */
export const replaceRange = (text: string, start: number, end: number, replacement: string): string =>
  text.slice(0, start) + replacement + text.slice(end);

/** Index of the match whose segment starts closest to `timeMs` (first one on a tie); 0 when there are none. */
export function nearestMatchIndex(matchStartsMs: readonly number[], timeMs: number): number {
  let best = 0;
  matchStartsMs.forEach((start, i) => {
    if (Math.abs(start - timeMs) < Math.abs(matchStartsMs[best] - timeMs)) best = i;
  });
  return best;
}

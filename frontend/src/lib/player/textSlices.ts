import type { TextMatch } from "./findMatches";

export interface TextSlice {
  text: string;
  /** Already "spoken" at the current playback time. */
  spoken: boolean;
  /** Index (within this segment's ranges) of the search match covering this slice, or -1. */
  match: number;
}

type Range = Pick<TextMatch, "start" | "end">;

/**
 * Split `text` at every match boundary and at the spoken/unspoken boundary so each slice has uniform
 * styling. Ranges must be sorted and non-overlapping (as findMatches returns them).
 */
export function buildSlices(text: string, ranges: readonly Range[], spokenChars: number): TextSlice[] {
  const cuts = new Set<number>([0, text.length]);
  for (const range of ranges) {
    cuts.add(range.start);
    cuts.add(range.end);
  }
  if (spokenChars > 0 && spokenChars < text.length) cuts.add(spokenChars);
  const points = [...cuts].filter((p) => p >= 0 && p <= text.length).sort((a, b) => a - b);

  const slices: TextSlice[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [start, end] = [points[i], points[i + 1]];
    if (start === end) continue;
    slices.push({
      text: text.slice(start, end),
      spoken: end <= spokenChars,
      match: ranges.findIndex((r) => start >= r.start && end <= r.end),
    });
  }
  return slices;
}

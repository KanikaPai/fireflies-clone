import type { TextMatch } from "./findMatches";

/** A highlight or comment range over a segment's text (offsets into the text, end exclusive; may overlap others). */
export interface TextMark {
  id: number;
  kind: "highlight" | "comment";
  start: number;
  end: number;
}

export interface TextSlice {
  text: string;
  /** Already "spoken" at the current playback time. */
  spoken: boolean;
  /** Index (within this segment's ranges) of the search match covering this slice, or -1. */
  match: number;
  /** Ids of the highlights covering this slice (usually 0 or 1). */
  highlightIds: readonly number[];
  /** Ids of the comment ranges covering this slice. */
  commentIds: readonly number[];
}

type Range = Pick<TextMatch, "start" | "end">;
const NO_MARKS: readonly TextMark[] = [];

/**
 * Split `text` at every search-match boundary, mark boundary and the spoken/unspoken boundary so each slice has
 * uniform styling. Search ranges must be sorted and non-overlapping (as findMatches returns them); marks may
 * overlap each other and the matches.
 */
export function buildSlices(text: string, ranges: readonly Range[], spokenChars: number, marks: readonly TextMark[] = NO_MARKS): TextSlice[] {
  const cuts = new Set<number>([0, text.length]);
  for (const range of ranges) {
    cuts.add(range.start);
    cuts.add(range.end);
  }
  for (const mark of marks) {
    cuts.add(mark.start);
    cuts.add(mark.end);
  }
  if (spokenChars > 0 && spokenChars < text.length) cuts.add(spokenChars);
  const points = [...cuts].filter((p) => p >= 0 && p <= text.length).sort((a, b) => a - b);

  const slices: TextSlice[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [start, end] = [points[i], points[i + 1]];
    if (start === end) continue;
    const covering = marks.filter((m) => start >= m.start && end <= m.end);
    slices.push({
      text: text.slice(start, end),
      spoken: end <= spokenChars,
      match: ranges.findIndex((r) => start >= r.start && end <= r.end),
      highlightIds: covering.filter((m) => m.kind === "highlight").map((m) => m.id),
      commentIds: covering.filter((m) => m.kind === "comment").map((m) => m.id),
    });
  }
  return slices;
}

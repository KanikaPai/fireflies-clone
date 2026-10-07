/**
 * Estimating which words of a segment have been "spoken" at a given time. The transcript has
 * segment-level timestamps only, so time is interpolated across the words, weighting each word by
 * its length (longer words take longer to say).
 */

export interface WordSpan {
  start: number;
  end: number;
}

/** Character spans of the whitespace-separated words in `text`. */
export function wordSpans(text: string): WordSpan[] {
  const spans: WordSpan[] = [];
  for (const match of text.matchAll(/\S+/g)) spans.push({ start: match.index, end: match.index + match[0].length });
  return spans;
}

/**
 * Number of words fully spoken at `timeMs` for a segment spanning [startMs, endMs].
 * 0 before the segment starts, all words once it ends.
 */
export function spokenWordCount(spans: readonly WordSpan[], startMs: number, endMs: number, timeMs: number): number {
  if (spans.length === 0 || timeMs <= startMs) return 0;
  if (timeMs >= endMs || endMs <= startMs) return spans.length;
  const weights = spans.map((span) => span.end - span.start + 1); // +1 for the pause after a word
  const total = weights.reduce((sum, w) => sum + w, 0);
  const target = ((timeMs - startMs) / (endMs - startMs)) * total;
  let cumulative = 0;
  let count = 0;
  for (const weight of weights) {
    cumulative += weight;
    if (cumulative > target) break;
    count += 1;
  }
  return count;
}

/** Character offset where the spoken part ends (0 when nothing has been spoken yet). */
export const spokenCharOffset = (spans: readonly WordSpan[], spokenWords: number): number =>
  spokenWords <= 0 ? 0 : spans[Math.min(spokenWords, spans.length) - 1].end;

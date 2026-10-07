/**
 * Index of the segment playing at `timeMs`: the last one whose start is <= timeMs (binary search,
 * O(log n)). Returns -1 before the first segment starts. `starts` must be sorted ascending.
 *
 * A segment stays "active" through the pause that follows it until the next one begins, which keeps
 * the highlight (and auto-scroll) from flickering off between turns.
 */
export function findActiveIndex(starts: readonly number[], timeMs: number): number {
  let low = 0;
  let high = starts.length - 1;
  let result = -1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    if (starts[mid] <= timeMs) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return result;
}

/** A text selection inside one transcript segment, as offsets into that segment's text (end exclusive). */
export interface SegmentSelection {
  segmentId: number;
  start: number;
  end: number;
  text: string;
}

/** Shrink [start, end) so it neither starts nor ends on whitespace. Returns null when only whitespace is left. */
export function trimRange(text: string, start: number, end: number): { start: number; end: number } | null {
  let s = start;
  let e = end;
  while (s < e && /\s/.test(text[s])) s++;
  while (e > s && /\s/.test(text[e - 1])) e--;
  return e > s ? { start: s, end: e } : null;
}

/**
 * The current browser selection, if it lies entirely inside one segment's text paragraph (`p[data-segment-text]`
 * within `article[data-segment-id]`). `textOf` gives the authoritative text of a segment; the selection is
 * rejected if the rendered paragraph does not read exactly like it (e.g. it is in edit mode).
 */
export function readSegmentSelection(root: HTMLElement, textOf: (segmentId: number) => string | undefined): { selection: SegmentSelection; rect: DOMRect } | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const owner = (node: Node): HTMLElement | null => (node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement)?.closest<HTMLElement>("p[data-segment-text]") ?? null;
  const paragraph = owner(range.startContainer);
  if (!paragraph || paragraph !== owner(range.endContainer) || !root.contains(paragraph)) return null;

  const segmentId = Number(paragraph.closest<HTMLElement>("[data-segment-id]")?.dataset.segmentId);
  const text = Number.isFinite(segmentId) ? textOf(segmentId) : undefined;
  if (text === undefined || paragraph.textContent !== text) return null;

  const before = document.createRange();
  before.selectNodeContents(paragraph);
  before.setEnd(range.startContainer, range.startOffset);
  const start = before.toString().length;
  const trimmed = trimRange(text, start, start + range.toString().length);
  if (!trimmed) return null;
  return { selection: { segmentId, ...trimmed, text: text.slice(trimmed.start, trimmed.end) }, rect: range.getBoundingClientRect() };
}

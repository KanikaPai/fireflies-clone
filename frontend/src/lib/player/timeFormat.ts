/** 125_000 -> "02:05"; one hour or more -> "1:02:05". Negative values clamp to 0. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/** Player readout, e.g. "00:12 / 18:42". */
export const formatClockPair = (currentMs: number, durationMs: number): string =>
  `${formatClock(currentMs)} / ${formatClock(durationMs)}`;

/**
 * Parse a `?t=` deep-link value into milliseconds: plain seconds ("120", "90.5") or a clock string
 * ("2:00", "1:02:05"). Returns null for anything invalid or negative.
 */
export function parseTimeParam(value: string | null | undefined): number | null {
  if (!value) return null;
  const text = value.trim();
  if (/^\d+(\.\d+)?$/.test(text)) return Math.round(Number(text) * 1000);
  if (!/^\d+(:\d{1,2}){1,2}$/.test(text)) return null;
  const parts = text.split(":").map(Number);
  if (parts.slice(1).some((part) => part > 59)) return null;
  return parts.reduce((total, part) => total * 60 + part, 0) * 1000;
}

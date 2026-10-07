export const MAX_TITLE_LENGTH = 255;

/** Returns an error message, or null when the title is acceptable. */
export function validateTitle(title: string): string | null {
  const trimmed = title.trim();
  if (!trimmed) return "Title can't be empty.";
  if (trimmed.length > MAX_TITLE_LENGTH) return `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`;
  return null;
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const isValidEmail = (value: string): boolean => EMAIL.test(value.trim());

/** "2026-10-07" + "14:30" in the user's timezone -> ISO string (UTC) for the API. */
export function localDateTimeToIso(date: string, time: string): string | null {
  if (!date) return null;
  const parsed = new Date(`${date}T${time || "00:00"}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

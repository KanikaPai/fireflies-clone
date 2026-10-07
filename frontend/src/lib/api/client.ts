import { trackRequest } from "./slowRequests";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

/** Error thrown for every failed API call (HTTP error or network failure). */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

type QueryValue = string | number | boolean | null | undefined | readonly number[];
export type Query = Record<string, QueryValue>;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Query;
  json?: unknown;
  form?: FormData;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${API_URL}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (Array.isArray(value)) value.forEach((item) => url.searchParams.append(key, String(item)));
    else if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/** FastAPI returns {"detail": string} for domain errors and {"detail": [{loc, msg}]} for validation errors. */
function messageFromDetail(detail: unknown, fallback: string): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => (item && typeof item === "object" && "msg" in item ? String(item.msg) : null))
      .filter(Boolean);
    if (parts.length) return parts.join("; ");
  }
  return fallback;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", query, json, form, signal } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: BodyInit | undefined;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (form) {
    body = form; // the browser sets the multipart boundary
  }

  let response: Response;
  const done = trackRequest();
  try {
    response = await fetch(buildUrl(path, query), { method, headers, body, signal });
  } catch (error) {
    done();
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "Could not reach the server. Check your connection and try again.");
  }
  done();

  if (response.status === 204) return undefined as T;
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload && typeof payload === "object" && "detail" in payload ? payload.detail : null;
    throw new ApiError(response.status, messageFromDetail(detail, `Request failed (${response.status})`));
  }
  return payload as T;
}

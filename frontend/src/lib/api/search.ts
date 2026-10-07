import { apiFetch } from "./client";
import type { SearchResponse } from "./types";

export const searchAll = (q: string, signal?: AbortSignal) =>
  apiFetch<SearchResponse>("/api/search", { query: { q }, signal });

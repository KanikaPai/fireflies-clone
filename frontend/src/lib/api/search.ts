import { apiFetch } from "./client";
import type { SearchResponse } from "./types";

export interface SearchOptions {
  limit?: number;
  matches_per_meeting?: number;
  per_category?: number;
}

export const searchAll = (q: string, options: SearchOptions = {}, signal?: AbortSignal) =>
  apiFetch<SearchResponse>("/api/search", { query: { q, ...options }, signal });

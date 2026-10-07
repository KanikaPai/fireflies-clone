import { apiFetch } from "./client";
import type { PersonWithStats } from "./types";

export const listPeople = (q?: string, signal?: AbortSignal) =>
  apiFetch<PersonWithStats[]>("/api/people", { query: { q }, signal });

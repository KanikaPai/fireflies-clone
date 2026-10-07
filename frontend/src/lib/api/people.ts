import { apiFetch } from "./client";
import type { Person, PersonCreate, PersonWithStats } from "./types";

export const listPeople = (q?: string, signal?: AbortSignal) =>
  apiFetch<PersonWithStats[]>("/api/people", { query: { q }, signal });

export const createPerson = (body: PersonCreate) => apiFetch<Person>("/api/people", { method: "POST", json: body });

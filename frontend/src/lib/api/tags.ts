import { apiFetch } from "./client";
import type { Tag } from "./types";

export const listTags = (signal?: AbortSignal) => apiFetch<Tag[]>("/api/tags", { signal });

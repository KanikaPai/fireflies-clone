import { apiFetch } from "./client";
import type { Tag, TagCreate } from "./types";

export const listTags = (signal?: AbortSignal) => apiFetch<Tag[]>("/api/tags", { signal });

export const createTag = (body: TagCreate) => apiFetch<Tag>("/api/tags", { method: "POST", json: body });

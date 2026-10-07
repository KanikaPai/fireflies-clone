import { apiFetch } from "./client";
import type { User } from "./types";

export const getMe = (signal?: AbortSignal) => apiFetch<User>("/api/me", { signal });

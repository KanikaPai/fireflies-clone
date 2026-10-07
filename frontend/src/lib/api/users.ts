import { apiFetch } from "./client";
import type { User, UserSettings, UserSettingsUpdate, UserUpdate } from "./types";

export const getMe = (signal?: AbortSignal) => apiFetch<User>("/api/me", { signal });

export const updateMe = (body: UserUpdate) => apiFetch<User>("/api/me", { method: "PATCH", json: body });

export const getSettings = (signal?: AbortSignal) => apiFetch<UserSettings>("/api/me/settings", { signal });

export const updateSettings = (body: UserSettingsUpdate) => apiFetch<UserSettings>("/api/me/settings", { method: "PATCH", json: body });

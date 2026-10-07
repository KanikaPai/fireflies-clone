import { apiFetch } from "./client";
import type { Segment, SegmentUpdate } from "./types";

export const updateSegment = (id: number, body: SegmentUpdate) =>
  apiFetch<Segment>(`/api/segments/${id}`, { method: "PATCH", json: body });

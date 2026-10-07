import type { MediaEngine } from "./engine";
import { HtmlAudioEngine } from "./htmlAudioEngine";
import { SimulatedEngine } from "./simulatedEngine";

interface EngineSource {
  durationMs: number;
  mediaUrl: string | null;
}

/** The single place that decides which engine backs a meeting: real audio if there is a recording. */
export function createEngine({ durationMs, mediaUrl }: EngineSource): MediaEngine {
  return mediaUrl ? new HtmlAudioEngine(mediaUrl, durationMs) : new SimulatedEngine(durationMs);
}

/** The playback rates offered by the speed button, in cycle order. */
const PLAYBACK_RATES = [0.5, 1, 1.25, 1.5, 2] as const;

export const nextRate = (current: number): number => {
  const index = PLAYBACK_RATES.findIndex((rate) => rate === current);
  return index < 0 ? 1 : PLAYBACK_RATES[(index + 1) % PLAYBACK_RATES.length]; // unknown rate -> back to 1x
};

/** Discrete engine state; a new object is created on every change so it works with useSyncExternalStore. */
export interface EngineState {
  playing: boolean;
  rate: number;
  /** Playback reached the end (cleared by seeking or playing again). */
  ended: boolean;
}

type Unsubscribe = () => void;

/**
 * Everything the UI needs from a media source. The meeting page only talks to this interface, so a real
 * <audio> element (HtmlAudioEngine) can replace the timer-driven SimulatedEngine without UI changes.
 *
 * Time and state are separate channels: time ticks many times a second while playing, state changes
 * rarely. Subscribers of time should select a cheap derived value (see useTimeSelector).
 */
export interface MediaEngine {
  readonly durationMs: number;
  play(): void;
  pause(): void;
  /** Jump to `ms` (clamped to [0, duration]). Does not change whether playback is running. */
  seek(ms: number): void;
  setRate(rate: number): void;
  getTime(): number;
  getState(): EngineState;
  subscribeTime(listener: (ms: number) => void): Unsubscribe;
  subscribeState(listener: () => void): Unsubscribe;
  /** Release resources (timers, media elements). */
  dispose(): void;
}

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

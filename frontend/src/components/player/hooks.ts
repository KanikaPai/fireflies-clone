"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

import { findActiveIndex } from "@/lib/player/activeSegment";
import type { EngineState, MediaEngine } from "@/lib/player/engine";

export interface PlayerActions {
  play(): void;
  pause(): void;
  toggle(): void;
  seek(ms: number): void;
  skip(deltaMs: number): void;
  setRate(rate: number): void;
  cycleRate(): void;
}

export interface PlayerContextValue {
  engine: MediaEngine;
  actions: PlayerActions;
  durationMs: number;
}

export const PlayerContext = createContext<PlayerContextValue | null>(null);

function usePlayer(): PlayerContextValue {
  const value = useContext(PlayerContext);
  if (!value) throw new Error("Player hooks must be used inside <PlayerProvider>");
  return value;
}

/** Stable actions object: components that only dispatch never re-render as time passes. */
export const usePlayerActions = (): PlayerActions => usePlayer().actions;
export const usePlayerEngine = (): MediaEngine => usePlayer().engine;
export const useDuration = (): number => usePlayer().durationMs;

/** Playing / rate / ended. Changes rarely (not per frame). */
export function usePlayerState(): EngineState {
  const { engine } = usePlayer();
  return useSyncExternalStore(engine.subscribeState, engine.getState, engine.getState);
}

/**
 * Subscribe to a value derived from the current time. The component re-renders only when the selected
 * value changes (compared with Object.is), NOT on every frame, so select something coarse and primitive
 * (a second count, a segment index, a word count).
 */
export function useTimeSelector<T>(selector: (timeMs: number) => T): T {
  const { engine } = usePlayer();
  const getSnapshot = () => selector(engine.getTime());
  return useSyncExternalStore(engine.subscribeTime, getSnapshot, getSnapshot);
}

/** Index of the segment playing now (-1 before the first); re-renders only when it changes. */
export const useActiveSegmentIndex = (starts: readonly number[]): number =>
  useTimeSelector((timeMs) => findActiveIndex(starts, timeMs));

/** Whole seconds elapsed, for the "00:12 / 18:42" readout. */
export const useElapsedSeconds = (): number => useTimeSelector((timeMs) => Math.floor(timeMs / 1000));

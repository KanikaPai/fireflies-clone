"use client";

import { useEffect, useMemo, type ReactNode } from "react";

import { createEngine } from "@/lib/player/createEngine";
import { clamp, nextRate } from "@/lib/player/engine";

import { PlayerContext, type PlayerActions } from "./hooks";

const KEY_SKIP_MS = 5_000;

interface PlayerProviderProps {
  durationMs: number;
  mediaUrl: string | null;
  /** Deep-link start position (?t=). */
  initialTimeMs?: number | null;
  children: ReactNode;
}

/** True when the key event came from somewhere the user is typing, so shortcuts must not fire. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * Owns the MediaEngine for one meeting and exposes stable actions through context. Current time lives
 * inside the engine (an external store), so this provider and its children never re-render per frame;
 * only components that call useTimeSelector do, and only when their selected value changes.
 */
export function PlayerProvider({ durationMs, mediaUrl, initialTimeMs, children }: PlayerProviderProps) {
  const engine = useMemo(() => {
    const created = createEngine({ durationMs, mediaUrl });
    if (initialTimeMs) created.seek(clamp(initialTimeMs, 0, durationMs));
    return created;
    // The deep-link position only applies when the engine is created.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMs, mediaUrl]);

  const actions = useMemo<PlayerActions>(
    () => ({
      play: () => engine.play(),
      pause: () => engine.pause(),
      toggle: () => (engine.getState().playing ? engine.pause() : engine.play()),
      seek: (ms) => engine.seek(ms),
      skip: (deltaMs) => engine.seek(engine.getTime() + deltaMs),
      setRate: (rate) => engine.setRate(rate),
      cycleRate: () => engine.setRate(nextRate(engine.getState().rate)),
    }),
    [engine],
  );

  useEffect(() => () => engine.pause(), [engine]);

  // Space = play/pause, ←/→ = 5s back/forward; ignored while typing or with modifier keys held.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      if (event.code === "Space") {
        // Let focused buttons/links keep their own Space behaviour.
        if (event.target instanceof HTMLElement && ["BUTTON", "A", "SUMMARY"].includes(event.target.tagName)) return;
        event.preventDefault();
        actions.toggle();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        actions.skip(-KEY_SKIP_MS);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        actions.skip(KEY_SKIP_MS);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [actions]);

  const value = useMemo(() => ({ engine, actions, durationMs }), [engine, actions, durationMs]);
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

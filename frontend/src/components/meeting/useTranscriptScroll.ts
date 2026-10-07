"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";

import { useTranscriptSync } from "./TranscriptSync";

/** Scroll `el` to the middle of `container` (smoothly), without touching any other scroll parent. */
export function scrollToCenter(container: HTMLElement, el: HTMLElement, behavior: ScrollBehavior = "smooth"): void {
  const c = container.getBoundingClientRect();
  const e = el.getBoundingClientRect();
  container.scrollTo({ top: container.scrollTop + (e.top - c.top) - c.height / 2 + e.height / 2, behavior });
}

/**
 * Keeps the active segment in view while "synced". The scroll happens only when the active segment
 * CHANGES (never per frame). Wheel, touch or scrollbar interaction by the user switches syncing off;
 * the "Sync with audio" pill (or any seek) turns it back on.
 */
export function useTranscriptScroll(containerRef: RefObject<HTMLElement | null>, activeSegmentId: number | null) {
  const { synced, setSynced } = useTranscriptSync();
  const lastScrolledId = useRef<number | null>(null);

  const scrollToActive = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const container = containerRef.current;
      if (!container || activeSegmentId === null) return;
      const el = container.querySelector<HTMLElement>(`[data-segment-id="${activeSegmentId}"]`);
      if (el) scrollToCenter(container, el, behavior);
    },
    [containerRef, activeSegmentId],
  );

  useEffect(() => {
    if (synced && activeSegmentId !== null && lastScrolledId.current !== activeSegmentId) {
      lastScrolledId.current = activeSegmentId;
      scrollToActive();
    }
  }, [synced, activeSegmentId, scrollToActive]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const stopSyncing = () => setSynced(false);
    container.addEventListener("wheel", stopSyncing, { passive: true });
    container.addEventListener("touchmove", stopSyncing, { passive: true });
    const onPointerDown = (event: PointerEvent) => {
      if (event.target === container) stopSyncing(); // a press on the container itself is a scrollbar drag
    };
    container.addEventListener("pointerdown", onPointerDown);
    return () => {
      container.removeEventListener("wheel", stopSyncing);
      container.removeEventListener("touchmove", stopSyncing);
      container.removeEventListener("pointerdown", onPointerDown);
    };
  }, [containerRef, setSynced]);

  const resync = useCallback(() => {
    setSynced(true);
    lastScrolledId.current = activeSegmentId;
    scrollToActive();
  }, [setSynced, activeSegmentId, scrollToActive]);

  return { synced, resync };
}

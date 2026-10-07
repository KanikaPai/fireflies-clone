"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { formatClock } from "@/lib/player/timeFormat";

import { useDuration, usePlayerActions, usePlayerEngine } from "./hooks";

/**
 * Thin purple progress line along the top edge of the player bar. Click or drag to seek; hovering shows
 * the time under the pointer. The fill is updated straight on the DOM node from the engine's time
 * channel, so smooth 60fps movement costs no React renders.
 */
export function ProgressBar() {
  const engine = usePlayerEngine();
  const actions = usePlayerActions();
  const durationMs = useDuration();
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [hover, setHover] = useState<{ x: number; ms: number } | null>(null);

  useEffect(() => {
    let lastSecond = -1;
    const paint = (ms: number) => {
      const ratio = durationMs > 0 ? Math.min(1, ms / durationMs) : 0;
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${ratio})`;
      const second = Math.floor(ms / 1000);
      if (trackRef.current && second !== lastSecond) {
        // ARIA values change once a second, not every frame.
        lastSecond = second;
        trackRef.current.setAttribute("aria-valuenow", String(second));
        trackRef.current.setAttribute("aria-valuetext", formatClock(ms));
      }
    };
    paint(engine.getTime());
    return engine.subscribeTime(paint);
  }, [engine, durationMs]);

  const msAt = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    return { ratio, ms: ratio * durationMs, x: event.clientX - rect.left };
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Home") actions.seek(0);
    else if (event.key === "End") actions.seek(durationMs);
    else return;
    event.preventDefault();
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.floor(durationMs / 1000)}
      aria-valuenow={0}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => {
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        actions.seek(msAt(event).ms);
      }}
      onPointerMove={(event) => {
        const { ms, x } = msAt(event);
        setHover({ x, ms });
        if (dragging.current) actions.seek(ms); // scrubbing updates the active transcript segment live
      }}
      onPointerUp={(event) => {
        dragging.current = false;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerLeave={() => !dragging.current && setHover(null)}
      className="group relative h-3 w-full cursor-pointer touch-none"
    >
      <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-brand-soft transition-[height] group-hover:h-[5px]">
        <div ref={fillRef} className="h-full origin-left bg-brand will-change-transform" style={{ transform: "scaleX(0)" }} />
      </div>
      {hover && (
        <div
          className="pointer-events-none absolute -top-8 -translate-x-1/2 rounded bg-toast px-2 py-1 text-xs font-medium text-toast-foreground"
          style={{ left: hover.x }}
        >
          {formatClock(hover.ms)}
        </div>
      )}
    </div>
  );
}

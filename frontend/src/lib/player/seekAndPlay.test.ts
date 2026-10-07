import { describe, expect, it, vi } from "vitest";

import { SimulatedEngine, type Clock } from "./simulatedEngine";
import { seekAndPlay } from "./seekAndPlay";

const clock: Clock = { now: () => 0, requestFrame: () => 1, cancelFrame: () => undefined };

describe("seekAndPlay", () => {
  it("seeks first, then plays", () => {
    const calls: string[] = [];
    seekAndPlay({ seek: (ms) => calls.push(`seek ${ms}`), play: () => calls.push("play") }, 5_000);
    expect(calls).toEqual(["seek 5000", "play"]);
  });

  it("starts a paused engine at the target time", () => {
    const engine = new SimulatedEngine(60_000, clock);
    seekAndPlay({ seek: (ms) => engine.seek(ms), play: () => engine.play() }, 12_000);
    expect(engine.getTime()).toBe(12_000);
    expect(engine.getState().playing).toBe(true);
  });

  it("keeps an already-playing engine playing", () => {
    const engine = new SimulatedEngine(60_000, clock);
    engine.play();
    const play = vi.spyOn(engine, "play");
    seekAndPlay({ seek: (ms) => engine.seek(ms), play: () => engine.play() }, 30_000);
    expect(play).toHaveBeenCalledOnce();
    expect(engine.getState().playing).toBe(true);
    expect(engine.getTime()).toBe(30_000);
  });

  it("plain seek leaves a paused engine paused (progress bar behaviour)", () => {
    const engine = new SimulatedEngine(60_000, clock);
    engine.seek(20_000);
    expect(engine.getState().playing).toBe(false);
  });
});

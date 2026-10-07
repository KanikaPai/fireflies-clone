import { describe, expect, it, vi } from "vitest";

import { nextRate } from "./engine";
import { SimulatedEngine, type Clock } from "./simulatedEngine";

/** A manual clock: frames only run when the test calls `advance`. */
function manualClock() {
  let now = 1_000;
  let callback: (() => void) | null = null;
  let nextId = 1;
  const clock: Clock = {
    now: () => now,
    requestFrame: (cb) => {
      callback = cb;
      return nextId++;
    },
    cancelFrame: () => {
      callback = null;
    },
  };
  return {
    clock,
    /** Move time forward and run one animation frame (if one is scheduled). */
    advance(ms: number) {
      now += ms;
      const cb = callback;
      callback = null;
      cb?.();
    },
    pending: () => callback !== null,
  };
}

describe("SimulatedEngine", () => {
  it("advances by real elapsed time x rate and stops at the duration", () => {
    const { clock, advance } = manualClock();
    const engine = new SimulatedEngine(10_000, clock);
    engine.play();
    advance(1_000);
    expect(engine.getTime()).toBe(1_000);
    advance(500);
    expect(engine.getTime()).toBe(1_500);
    advance(60_000); // a long stall must not overshoot
    expect(engine.getTime()).toBe(10_000);
    expect(engine.getState()).toMatchObject({ playing: false, ended: true });
  });

  it("applies the playback rate, including a change mid-play", () => {
    const { clock, advance } = manualClock();
    const engine = new SimulatedEngine(100_000, clock);
    engine.setRate(2);
    engine.play();
    advance(1_000);
    expect(engine.getTime()).toBe(2_000);
    engine.setRate(0.5);
    advance(1_000);
    expect(engine.getTime()).toBe(2_500); // earlier interval kept the old rate
  });

  it("pause freezes time (counting up to the pause) and play resumes from there", () => {
    const { clock, advance, pending } = manualClock();
    const engine = new SimulatedEngine(100_000, clock);
    engine.play();
    advance(1_000);
    engine.pause();
    expect(pending()).toBe(false);
    const frozen = engine.getTime();
    advance(5_000);
    expect(engine.getTime()).toBe(frozen);
    engine.play();
    advance(1_000);
    expect(engine.getTime()).toBe(frozen + 1_000);
  });

  it("seek clamps, keeps the play state, and clears 'ended'", () => {
    const { clock, advance } = manualClock();
    const engine = new SimulatedEngine(10_000, clock);
    engine.seek(-5);
    expect(engine.getTime()).toBe(0);
    engine.seek(99_999);
    expect(engine.getTime()).toBe(10_000);
    engine.play(); // at the end: restarts from 0
    expect(engine.getTime()).toBe(0);
    advance(1_000);
    engine.seek(4_000);
    expect(engine.getState().playing).toBe(true);
    advance(500);
    expect(engine.getTime()).toBe(4_500);
  });

  it("notifies time and state subscribers, and stops notifying after unsubscribe", () => {
    const { clock, advance } = manualClock();
    const engine = new SimulatedEngine(10_000, clock);
    const onTime = vi.fn();
    const onState = vi.fn();
    const offTime = engine.subscribeTime(onTime);
    engine.subscribeState(onState);
    engine.play();
    advance(100);
    expect(onTime).toHaveBeenLastCalledWith(100);
    expect(onState).toHaveBeenCalled();
    const calls = onTime.mock.calls.length;
    offTime();
    advance(100);
    expect(onTime.mock.calls.length).toBe(calls);
  });

  it("creates a new state object per change and never plays a zero-length meeting", () => {
    const { clock } = manualClock();
    const engine = new SimulatedEngine(5_000, clock);
    const before = engine.getState();
    engine.setRate(1.5);
    expect(engine.getState()).not.toBe(before);
    const empty = new SimulatedEngine(0, clock);
    empty.play();
    expect(empty.getState().playing).toBe(false);
  });

  it("dispose cancels the pending frame", () => {
    const { clock, pending } = manualClock();
    const engine = new SimulatedEngine(10_000, clock);
    engine.play();
    expect(pending()).toBe(true);
    engine.dispose();
    expect(pending()).toBe(false);
  });
});

describe("nextRate", () => {
  it("cycles 0.5 -> 1 -> 1.25 -> 1.5 -> 2 -> 0.5", () => {
    expect([0.5, 1, 1.25, 1.5, 2].map(nextRate)).toEqual([1, 1.25, 1.5, 2, 0.5]);
    expect(nextRate(3)).toBe(1); // unknown rate falls back into the cycle
  });
});

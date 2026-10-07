import { clamp, type EngineState, type MediaEngine } from "./engine";
import { Emitter } from "./emitter";

/** Injectable time source so the engine is deterministic under test. */
export interface Clock {
  now(): number;
  requestFrame(callback: () => void): number;
  cancelFrame(id: number): void;
}

const browserClock: Clock = {
  now: () => performance.now(),
  requestFrame: (callback) => requestAnimationFrame(() => callback()),
  cancelFrame: (id) => cancelAnimationFrame(id),
};

/**
 * Timer-driven playback for meetings with no recording (media_url is null). Advances time on every
 * animation frame by the real elapsed time (performance.now() delta) multiplied by the playback rate,
 * clamps to the duration and stops there.
 */
export class SimulatedEngine implements MediaEngine {
  private time = 0;
  private state: EngineState = { playing: false, rate: 1, ended: false };
  private lastNow = 0;
  private frame: number | null = null;
  private readonly timeEvents = new Emitter<[number]>();
  private readonly stateEvents = new Emitter<[]>();

  constructor(
    readonly durationMs: number,
    private readonly clock: Clock = browserClock,
  ) {}

  getTime = (): number => this.time;
  getState = (): EngineState => this.state;
  subscribeTime = (listener: (ms: number) => void) => this.timeEvents.subscribe(listener);
  subscribeState = (listener: () => void) => this.stateEvents.subscribe(listener);

  play(): void {
    if (this.state.playing || this.durationMs <= 0) return;
    if (this.time >= this.durationMs) this.time = 0; // replay from the start after the end
    this.lastNow = this.clock.now();
    this.setState({ playing: true, ended: false });
    this.timeEvents.emit(this.time);
    this.schedule();
  }

  pause(): void {
    if (!this.state.playing) return;
    this.advance(); // account for the time since the last frame
    this.cancel();
    this.setState({ playing: false });
  }

  seek(ms: number): void {
    this.time = clamp(ms, 0, this.durationMs);
    this.lastNow = this.clock.now();
    if (this.state.ended && this.time < this.durationMs) this.setState({ ended: false });
    this.timeEvents.emit(this.time);
  }

  setRate(rate: number): void {
    if (this.state.playing) this.advance(); // finish the elapsed interval at the old rate first
    this.setState({ rate });
  }

  dispose(): void {
    this.cancel();
    this.timeEvents.clear();
    this.stateEvents.clear();
  }

  private readonly tick = (): void => {
    this.frame = null;
    this.advance();
    this.timeEvents.emit(this.time);
    if (this.time >= this.durationMs) {
      this.setState({ playing: false, ended: true });
      return;
    }
    this.schedule();
  };

  private advance(): void {
    const now = this.clock.now();
    this.time = clamp(this.time + (now - this.lastNow) * this.state.rate, 0, this.durationMs);
    this.lastNow = now;
  }

  private schedule(): void {
    if (this.frame === null) this.frame = this.clock.requestFrame(this.tick);
  }

  private cancel(): void {
    if (this.frame !== null) this.clock.cancelFrame(this.frame);
    this.frame = null;
  }

  private setState(patch: Partial<EngineState>): void {
    this.state = { ...this.state, ...patch };
    this.stateEvents.emit();
  }
}

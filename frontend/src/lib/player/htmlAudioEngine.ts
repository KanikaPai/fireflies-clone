import { clamp, type EngineState, type MediaEngine } from "./engine";
import { Emitter } from "./emitter";

/**
 * Wraps an <audio> element for meetings that have a real recording (media_url set). Not used by the
 * seeded data, but it implements the same MediaEngine contract as SimulatedEngine.
 */
export class HtmlAudioEngine implements MediaEngine {
  private readonly audio: HTMLAudioElement;
  private state: EngineState = { playing: false, rate: 1, ended: false };
  private frame: number | null = null;
  private readonly timeEvents = new Emitter<[number]>();
  private readonly stateEvents = new Emitter<[]>();

  constructor(
    mediaUrl: string,
    readonly durationMs: number,
  ) {
    this.audio = new Audio(mediaUrl);
    this.audio.preload = "metadata";
    this.audio.addEventListener("play", this.onPlay);
    this.audio.addEventListener("pause", this.onPause);
    this.audio.addEventListener("ended", this.onEnded);
    this.audio.addEventListener("seeked", this.emitTime);
    this.audio.addEventListener("timeupdate", this.emitTime);
  }

  getTime = (): number => this.audio.currentTime * 1000;
  getState = (): EngineState => this.state;
  subscribeTime = (listener: (ms: number) => void) => this.timeEvents.subscribe(listener);
  subscribeState = (listener: () => void) => this.stateEvents.subscribe(listener);

  play(): void {
    void this.audio.play().catch(() => this.setState({ playing: false })); // autoplay policy / load errors
  }
  pause(): void {
    this.audio.pause();
  }
  seek(ms: number): void {
    this.audio.currentTime = clamp(ms, 0, this.durationMs) / 1000;
    if (this.state.ended) this.setState({ ended: false });
  }
  setRate(rate: number): void {
    this.audio.playbackRate = rate;
    this.setState({ rate });
  }
  dispose(): void {
    this.cancel();
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
    this.timeEvents.clear();
    this.stateEvents.clear();
  }

  private readonly emitTime = (): void => this.timeEvents.emit(this.getTime());

  // `timeupdate` only fires ~4x/second, so poll each frame while playing for smooth highlighting.
  private readonly loop = (): void => {
    this.emitTime();
    this.frame = requestAnimationFrame(this.loop);
  };
  private cancel(): void {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
  }
  private readonly onPlay = (): void => {
    this.setState({ playing: true, ended: false });
    if (this.frame === null) this.frame = requestAnimationFrame(this.loop);
  };
  private readonly onPause = (): void => {
    this.cancel();
    this.setState({ playing: false });
    this.emitTime();
  };
  private readonly onEnded = (): void => {
    this.cancel();
    this.setState({ playing: false, ended: true });
  };
  private setState(patch: Partial<EngineState>): void {
    this.state = { ...this.state, ...patch };
    this.stateEvents.emit();
  }
}

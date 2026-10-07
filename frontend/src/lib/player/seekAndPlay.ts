import type { PlayerActions } from "@/components/player/hooks";

/**
 * Jump to a moment AND start playback. Used by every content link (transcript lines, timestamps, summary
 * bullets, notes, action items, outline). Dragging the progress bar uses plain `seek` so the play/pause
 * state is preserved.
 */
export function seekAndPlay(actions: Pick<PlayerActions, "seek" | "play">, ms: number): void {
  actions.seek(ms);
  actions.play();
}

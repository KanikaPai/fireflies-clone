"""Estimating transcript timestamps from text length (shared by the seeder and the txt parser)."""

import random

WORDS_PER_SECOND = 1.6
LEAD_IN_MS = 3_000
PAUSE_RANGE_S = (1.5, 5.0)
MIN_SPEECH_MS = 500


def speech_ms(text: str) -> int:
    return max(MIN_SPEECH_MS, int(len(text.split()) / WORDS_PER_SECOND * 1000))


def pause_ms(rng: random.Random) -> int:
    return int(rng.uniform(*PAUSE_RANGE_S) * 1000)


def layout_timestamps(texts: list[str], rng: random.Random) -> list[tuple[int, int]]:
    """Assign non-overlapping (start_ms, end_ms) spans: speech time from word count plus a pause."""
    spans: list[tuple[int, int]] = []
    cursor = LEAD_IN_MS
    for t in texts:
        duration = speech_ms(t)
        spans.append((cursor, cursor + duration))
        cursor += duration + pause_ms(rng)
    return spans

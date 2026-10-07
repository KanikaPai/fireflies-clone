"""Question vocabulary: tokenising, stopwords, light stemming and a modest synonym map."""

from .common import words

# Words that carry no topic: function words, question words and meeting boilerplate ("the team discussed ...").
STOPWORDS = frozenset(
    """a about above after again all also am an and any anyone anything are around as at be been being but by can could did
    do does doing done else ever every everyone for from get give go going had has have he her him his how i if in into is
    it its just let like me more most much my of on or our out over please really she should show so some someone something
    than that the their them then there these they this those to too us very was we were what whats when where which who
    whom why will with would you your
    main key major biggest top meeting meetings call team teams session discuss discusses discussed discussing discussion
    talk talks talked talking said say says mention mentioned mentions list happen happened happens point points think
    thought thinks view views opinion comment comments share shared raise raised suggest suggested cover covered tell
    overall regarding related""".split()
)

# Groups of words that mean roughly the same thing in a meeting; a question about one also matches the others.
SYNONYMS: list[frozenset[str]] = [
    frozenset({"launch", "release", "ship", "rollout", "golive", "deploy", "publish"}),
    frozenset({"price", "pricing", "cost", "budget", "spend", "expensive", "fee", "discount"}),
    frozenset({"deadline", "date", "timeline", "due", "schedule", "eta", "friday", "monday"}),
    frozenset({"risk", "concern", "issue", "problem", "blocker", "worry", "worried", "challenge", "hesitant", "delay", "slip"}),
    frozenset({"customer", "client", "user", "account", "buyer"}),
    frozenset({"hire", "hiring", "candidate", "interview", "recruit", "headcount", "offer"}),
    frozenset({"decision", "decide", "agree", "approve", "commit"}),
    frozenset({"bug", "defect", "crash", "error", "regression", "outage"}),
    frozenset({"revenue", "sales", "arr", "bookings", "pipeline"}),
    frozenset({"goal", "target", "objective", "okr", "milestone"}),
]


def stem(word: str) -> str:
    """Strip common suffixes so launch / launched / launching / launches share one stem."""
    w = word.lower()
    for suffix in ("ingly", "edly", "ing", "ed", "ies", "es", "s", "ly"):
        if w.endswith(suffix) and len(w) - len(suffix) >= 3 and not (suffix == "s" and w.endswith("ss")):
            w = w[: -len(suffix)] + ("y" if suffix == "ies" else "")
            break
    if len(w) > 4 and w[-1] == w[-2] and w[-1] not in "lsz":
        w = w[:-1]  # shipped -> shipp -> ship
    return w[:-1] if len(w) > 3 and w.endswith("e") else w


SYNONYM_STEMS: list[frozenset[str]] = [frozenset(stem(w) for w in group) for group in SYNONYMS]


def content_words(text: str, exclude: frozenset[str] = frozenset()) -> list[str]:
    """Lowercase, punctuation-free words that are not stopwords (order kept, duplicates removed)."""
    out: dict[str, None] = {}
    for w in words(text):
        w = w.removesuffix("'s").replace("'", "")
        if len(w) >= 3 and w not in STOPWORDS and w not in exclude:
            out[w] = None
    return list(out)


def stems_of(text: str) -> list[str]:
    """Every word of `text` as a stem, in order (no stopword filtering: used for phrase matching)."""
    return [stem(w.replace("'", "")) for w in words(text)]


def synonyms_of(term_stem: str) -> set[str]:
    """Stems that mean roughly the same as `term_stem` (excluding itself)."""
    return {s for group in SYNONYM_STEMS if term_stem in group for s in group} - {term_stem}


def surface_synonyms(word: str) -> set[str]:
    """Raw synonym words (for building the full-text query) of the group `word` belongs to."""
    s = stem(word)
    return {w for group, stems in zip(SYNONYMS, SYNONYM_STEMS, strict=True) if s in stems for w in group} - {word}

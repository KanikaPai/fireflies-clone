"""Helpers for safely querying the transcript_fts FTS5 index."""

import re

_TOKEN = re.compile(r"\w+", re.UNICODE)
MAX_TERMS = 10


def tokenize(q: str) -> list[str]:
    return _TOKEN.findall(q)[:MAX_TERMS]


def build_match_query(q: str) -> str | None:
    """Build an FTS5 MATCH expression from free text, or None if there is nothing searchable.

    User input is reduced to alphanumeric tokens, each wrapped in double quotes, so FTS5 operators and
    punctuation (" * ( ) : - AND OR NOT NEAR ...) are always treated as literals and cannot break the
    query. Terms are ANDed. The last term also matches as a prefix (type-ahead); it is written as
    ("term" OR "term"*) because prefix queries are not stemmed by the porter tokenizer.
    """
    terms = tokenize(q)
    if not terms:
        return None
    parts = [f'"{t}"' for t in terms[:-1]]
    last = terms[-1]
    parts.append(f'("{last}" OR "{last}"*)')
    return " ".join(parts)

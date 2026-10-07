"""The deterministic answer engine: only quotes or lists what is in the meeting, never invents text."""

import math
import re

from app.schemas.askfred import AskResponse, Citation
from app.schemas.person import PersonBrief
from app.schemas.transcript import SegmentOut
from app.services.export import clock

from .common import NOT_FOUND, Meeting, cite, dedupe, first_names, words
from .intents import Intent, detect_intent

_STOPWORDS = frozenset(
    """a about after all also am an and any are as at be been being but by can could did do does for from get give had has
    have he her him his how i if in into is it its just me my of on or our out please she should show so some tell than that
    the their them then there these they this those to us was we were what when where which who whom why will with would you
    your main key major biggest top meeting meetings discussed discussion talked talk talking said say says mentioned mention list
    happen happened happens point points think thought view views opinion comment comments share shared raise raised suggest suggested""".split()
)
# Groups of words that mean roughly the same thing in a meeting; a question about one matches the others at a discount.
_SYNONYMS = [
    {"concern", "risk", "worry", "worried", "issue", "problem", "blocker", "challenge", "hesitant", "delay", "slip"},
    {"decision", "decide", "agree", "approve", "approved", "commit"},
    {"price", "pricing", "cost", "budget", "spend", "expensive"},
    {"deadline", "due", "date", "timeline", "schedule", "friday", "monday"},
    {"hire", "hiring", "recruit", "candidate", "headcount"},
]


def _stem(word: str) -> str:
    w = word.lower()
    for suffix in ("ingly", "edly", "ing", "ed", "es", "s", "ly"):
        if w.endswith(suffix) and len(w) - len(suffix) >= 3:
            w = w[: -len(suffix)]
            break
    return w[:-1] if len(w) > 3 and w.endswith("e") else w


_SYN_STEMS = [{_stem(w) for w in group} for group in _SYNONYMS]

def _quote(segment: SegmentOut, excerpt: str) -> str:
    return f'> "{excerpt}"\n> — **{segment.speaker.name}** ({clock(segment.start_ms)})'


def _best_excerpt(text: str, stems: set[str], limit: int = 280) -> str:
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    best = max(sentences, key=lambda s: len({_stem(w) for w in words(s)} & stems)) if stems else sentences[0]
    return best if len(best) <= limit else best[: limit - 1].rstrip() + "…"


def _segment_at(segments: list[SegmentOut], ms: int) -> SegmentOut | None:
    """The segment playing at `ms` (the last one starting at or before it)."""
    best = None
    for s in segments:
        if s.start_ms <= ms:
            best = s
        else:
            break
    return best or (segments[0] if segments else None)


def _reply(text: str, citations: list[Citation] | None = None) -> AskResponse:
    return AskResponse(answer_markdown=text, citations=dedupe(citations or []), source="heuristic")



def answer_heuristically(ctx: Meeting, question: str) -> AskResponse:
    """Route the question by intent to an answer builder, falling back to keyword search."""
    d = ctx.detail
    if not ctx.segments and not d.summary and not d.action_items:
        return _reply("This meeting has no transcript yet, so there is nothing to answer from.")
    intent, speaker = detect_intent(question, ctx)
    if intent is Intent.EMAIL:
        return _reply(_follow_up_email(ctx))
    if intent is Intent.ACTIONS:
        return _action_items(ctx)
    if intent is Intent.SUMMARY:
        return _summary_points(ctx)
    if intent is Intent.SPEAKER and speaker is not None:
        return _speaker_lines(ctx, question, speaker)
    return _keyword_answer(ctx, question)


def _action_items(ctx: Meeting) -> AskResponse:
    items = ctx.detail.action_items
    if not items:
        return _reply("No action items were recorded for this meeting.")
    by_id = ctx.by_id
    lines = []
    citations = []
    for a in items:
        extras = []
        if a.assignee:
            extras.append(f"**{a.assignee.name}**")
        if a.due_date:
            extras.append(f"due {a.due_date:%b %d}".replace(" 0", " "))
        lines.append(f"- [{'x' if a.is_completed else ' '}] {a.text}" + (f" — {', '.join(extras)}" if extras else ""))
        if a.source_segment_id in by_id:
            citations.append(cite(by_id[a.source_segment_id]))
    open_count = sum(1 for a in items if not a.is_completed)
    intro = f"Here are the action items from **{ctx.detail.title}** ({open_count} open, {len(items) - open_count} done):"
    return _reply(intro + "\n\n" + "\n".join(lines), citations)


def _summary_points(ctx: Meeting) -> AskResponse:
    summary = ctx.detail.summary
    if summary is None or not summary.bullets:
        if ctx.detail.chapters:
            lines = [f"- **{c.title}** ({clock(c.start_ms)}): {c.summary}" for c in ctx.detail.chapters if c.summary]
            return _reply(f"Here is the outline of **{ctx.detail.title}**:\n\n" + "\n".join(lines))
        return _reply("No summary is available for this meeting yet.")
    lines = [f"- **{b.label}:** {b.text} ({clock(b.start_ms)})" for b in summary.bullets]
    citations = [cite(s) for b in summary.bullets if (s := _segment_at(ctx.segments, b.start_ms))]
    text = f"Here are the key points and decisions from **{ctx.detail.title}**:\n\n" + "\n".join(lines)
    return _reply(text, citations)


def _follow_up_email(ctx: Meeting) -> str:
    d = ctx.detail
    first_names = [p.name.split()[0] for p in d.participants if p.name != ctx.user_name]
    greeting = "Hi " + (", ".join(first_names[:-1]) + " and " + first_names[-1] if len(first_names) > 1 else first_names[0]) if first_names else "Hi all"
    lines = [
        f"**Subject:** Follow-up: {d.title} ({d.meeting_date:%b} {d.meeting_date.day})",
        "",
        f"{greeting},",
        "",
        f"Thanks for joining {d.title} on {d.meeting_date:%B} {d.meeting_date.day}. Here is a quick recap.",
    ]
    if d.summary and d.summary.bullets:
        lines += ["", "**Key points**"] + [f"- {b.label}: {b.text}" for b in d.summary.bullets]
    if d.action_items:
        lines += ["", "**Action items**"]
        for a in d.action_items:
            owner = f" — {a.assignee.name}" if a.assignee else ""
            due = f" (due {a.due_date:%b} {a.due_date.day})" if a.due_date else ""
            lines.append(f"- {a.text}{owner}{due}")
    lines += ["", "Let me know if I missed anything.", "", "Best,", ctx.user_name]
    return "\n".join(lines)


def _speaker_lines(ctx: Meeting, question: str, person: PersonBrief) -> AskResponse:
    mine = [s for s in ctx.segments if s.speaker.id == person.id]
    name_stems = {_stem(w) for w in first_names(person.name)}
    topic = _topic_stems(question) - name_stems
    scored = sorted(mine, key=lambda s: (-_overlap(s, topic), -len(s.text)))
    if topic and _overlap(scored[0], topic) == 0:
        return _reply(f"I couldn't find {person.name} saying anything about that in this meeting's transcript.")
    top = sorted(scored[:3], key=lambda s: s.start_ms)
    blocks = [_quote(s, _best_excerpt(s.text, topic)) for s in top]
    shown = ", ".join(dict.fromkeys(w for w in words(question) if w not in _STOPWORDS and len(w) >= 3 and _stem(w) in topic))
    about = f" about **{shown}**" if topic else ""
    return _reply(f"Here's what **{person.name}** said{about}:\n\n" + "\n\n".join(blocks), [cite(s) for s in top])


def _topic_stems(question: str) -> set[str]:
    return {_stem(w) for w in words(question) if w not in _STOPWORDS and len(w) >= 3 and not w.endswith("'s")}


def _overlap(segment: SegmentOut, stems: set[str]) -> int:
    return len(stems & {_stem(w) for w in words(segment.text)})


def _keyword_answer(ctx: Meeting, question: str) -> AskResponse:
    terms = [t for t in dict.fromkeys(_stem(w) for w in words(question) if w not in _STOPWORDS and len(w) >= 3)]
    if not terms:
        return _reply(NOT_FOUND)
    groups = [(t, next((g - {t} for g in _SYN_STEMS if t in g), set())) for t in terms]  # (term, synonyms)
    seg_stems = [{_stem(w) for w in words(s.text)} for s in ctx.segments]
    n = max(1, len(ctx.segments))
    weights = {t: 1 + math.log(n / (1 + sum(t in st for st in seg_stems))) for t, _ in groups}

    scored: list[tuple[float, int]] = []
    needed = math.ceil(len(groups) / 2)
    for i, stems in enumerate(seg_stems):
        score, hit = 0.0, 0
        for term, syns in groups:
            if term in stems:
                score, hit = score + weights[term], hit + 1
            elif syns & stems:
                score, hit = score + 0.6 * weights[term], hit + 1
        if hit >= needed and score > 0:
            scored.append((score, i))
    if not scored:
        return _reply(NOT_FOUND)
    top = sorted(sorted(scored, key=lambda x: (-x[0], x[1]))[:3], key=lambda x: x[1])
    match_stems = set(terms) | {s for _, syns in groups for s in syns}
    blocks, cites = [], []
    for _, i in top:
        seg = ctx.segments[i]
        blocks.append(_quote(seg, _best_excerpt(seg.text, match_stems)))
        cites.append(cite(seg))
    shown = ", ".join(w for w in dict.fromkeys(w for w in words(question) if w not in _STOPWORDS and len(w) >= 3))
    return _reply(f"Here's what was discussed about **{shown}**:\n\n" + "\n\n".join(blocks), cites)

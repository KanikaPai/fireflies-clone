"""The deterministic answer engine: only quotes or lists what is in the meeting, never invents text.

Routing lives in ``intents``; metadata answers in ``facts``; ranked transcript search in ``retrieval``. This module
composes the answers: action items, summary points, a follow-up email, a speaker's lines, and topic questions
(keyword / status) that quote the best transcript lines and fall back to a summary overview instead of a dead end.
"""

import re

from app.schemas.askfred import AskResponse
from app.schemas.person import PersonBrief
from app.schemas.summary import SummaryBullet
from app.schemas.transcript import SegmentOut
from app.services.export import clock

from . import facts, retrieval
from .common import NOT_FOUND, Citation, Meeting, cite, first_names, reply, words
from .intents import STATUS_WORDS, Intent, detect_intent
from .terms import STOPWORDS, stem, stems_of

TOP_QUOTES = 3
FALLBACK_BULLETS = 3


def _quote(segment: SegmentOut, excerpt: str) -> str:
    return f'> "{excerpt}"\n> — **{segment.speaker.name}** ({clock(segment.start_ms)})'


def _best_excerpt(text: str, stems: set[str], limit: int = 280) -> str:
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    best = max(sentences, key=lambda s: len(set(stems_of(s)) & stems)) if stems else sentences[0]
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


def answer_heuristically(ctx: Meeting, question: str) -> AskResponse:
    """Route the question by intent to an answer builder, falling back to ranked search over the transcript."""
    d = ctx.detail
    if not ctx.segments and not d.summary and not d.action_items:
        return reply("This meeting has no transcript yet, so there is nothing to answer from.")
    intent, speaker = detect_intent(question, ctx)
    if intent is Intent.EMAIL:
        return reply(_follow_up_email(ctx))
    if intent is Intent.PARTICIPANTS:
        return facts.participants(ctx)
    if intent is Intent.DURATION:
        return facts.duration(ctx)
    if intent is Intent.WHEN:
        return facts.when(ctx)
    if intent is Intent.TALK_TIME:
        return facts.talk_time(ctx)
    if intent is Intent.ACTIONS:
        return _action_items(ctx)
    if intent is Intent.STATUS:
        return _topic_answer(ctx, question, status=True)
    if intent is Intent.SUMMARY:
        return _summary_points(ctx)
    if intent is Intent.SPEAKER and speaker is not None:
        return _speaker_lines(ctx, question, speaker)
    return _topic_answer(ctx, question)


def _action_items(ctx: Meeting) -> AskResponse:
    items = ctx.detail.action_items
    if not items:
        return reply("No action items were recorded for this meeting.")
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
    return reply(intro + "\n\n" + "\n".join(lines), citations)


def _summary_points(ctx: Meeting) -> AskResponse:
    summary = ctx.detail.summary
    if summary is None or not summary.bullets:
        if ctx.detail.chapters:
            lines = [f"- **{c.title}** ({clock(c.start_ms)}): {c.summary}" for c in ctx.detail.chapters if c.summary]
            return reply(f"Here is the outline of **{ctx.detail.title}**:\n\n" + "\n".join(lines))
        return reply("No summary is available for this meeting yet.")
    lines = [f"- **{b.label}:** {b.text} ({clock(b.start_ms)})" for b in summary.bullets]
    citations = [cite(s) for b in summary.bullets if (s := _segment_at(ctx.segments, b.start_ms))]
    text = f"Here are the key points and decisions from **{ctx.detail.title}**:\n\n" + "\n".join(lines)
    return reply(text, citations)


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
    name_stems = {stem(w) for w in first_names(person.name)}
    topic = _topic_stems(question) - name_stems
    scored = sorted(mine, key=lambda s: (-_overlap(s, topic), -len(s.text)))
    if topic and _overlap(scored[0], topic) == 0:
        return reply(f"I couldn't find {person.name} saying anything about that in this meeting's transcript.")
    top = sorted(scored[:3], key=lambda s: s.start_ms)
    blocks = [_quote(s, _best_excerpt(s.text, topic)) for s in top]
    shown = ", ".join(dict.fromkeys(w for w in words(question) if w not in STOPWORDS and len(w) >= 3 and stem(w) in topic))
    about = f" about **{shown}**" if topic else ""
    return reply(f"Here's what **{person.name}** said{about}:\n\n" + "\n\n".join(blocks), [cite(s) for s in top])


def _topic_stems(question: str) -> set[str]:
    return {stem(w) for w in words(question) if w not in STOPWORDS and len(w) >= 3 and not w.endswith("'s")}


def _overlap(segment: SegmentOut, stems: set[str]) -> int:
    return len(stems & {stem(w) for w in words(segment.text)})


def _bullet_line(b: SummaryBullet) -> str:
    return f"- **{b.label}:** {b.text} ({clock(b.start_ms)})"


def _topic_answer(ctx: Meeting, question: str, status: bool = False) -> AskResponse:
    """Quote the best transcript lines for a topic, led by the summary note that matches it (if any)."""
    query = retrieval.build_query(question, STATUS_WORDS if status else frozenset())
    hits = retrieval.search(ctx, query, TOP_QUOTES)
    bullets = _relevant_bullets(retrieval.matching_bullets(ctx, query), query, hits, status)
    chapters = retrieval.matching_chapters(ctx, query)
    if not hits and not (status and bullets):
        return _overview_fallback(ctx)

    shown = ", ".join(query.words)
    parts: list[str] = []
    citations: list[Citation] = []
    if status and bullets:
        note = bullets[:3]
        parts.append(f"Here is what the summary says about **{shown}**:\n\n" + "\n".join(_bullet_line(b) for b in note))
        citations += [cite(seg) for b in note if (seg := _segment_at(ctx.segments, b.start_ms))]
    elif bullets:
        parts.append("**From the summary:**\n" + _bullet_line(bullets[0]))
        if seg := _segment_at(ctx.segments, bullets[0].start_ms):
            citations.append(cite(seg))
    elif chapters:
        c = chapters[0]
        parts.append(f"**From the chapter “{c.title}”** ({clock(c.start_ms)})" + (f": {c.summary}" if c.summary else ""))
    if hits:
        top = sorted(hits, key=lambda h: h.segment.start_ms)
        quotes = "\n\n".join(_quote(h.segment, _best_excerpt(h.segment.text, query.match_stems)) for h in top)
        lead = "Supporting lines from the transcript:" if parts else f"Here's what was discussed about **{shown}**:"
        parts.append(f"{lead}\n\n{quotes}")
        citations += [cite(h.segment) for h in top]
    citations.sort(key=lambda c: c.start_ms)
    return reply("\n\n".join(parts), citations)


def _relevant_bullets(bullets: list[SummaryBullet], query: retrieval.Query, hits: list[retrieval.Hit], status: bool) -> list[SummaryBullet]:
    """Summary notes worth showing with the quotes: those naming the topic, plus (for a plain question) a synonym-only
    one that sits at a quoted line. A status question falls back to synonym-only notes when none name the topic."""
    direct = [b for b in bullets if retrieval.is_direct(b, query)]
    if status:
        return direct or bullets
    near = [b for b in bullets if b not in direct and any(abs(h.segment.start_ms - b.start_ms) <= retrieval.BULLET_WINDOW_MS[1] for h in hits)]
    return direct + near


def _overview_fallback(ctx: Meeting) -> AskResponse:
    """Nothing matched: show what the meeting did cover instead of a dead end. Only uses the meeting's own content."""
    d = ctx.detail
    bullets = d.summary.bullets[:FALLBACK_BULLETS] if d.summary else []
    if bullets:
        lines = [_bullet_line(b) for b in bullets]
        citations = [cite(seg) for b in bullets if (seg := _segment_at(ctx.segments, b.start_ms))]
    else:
        chapters = [c for c in d.chapters if c.summary][:FALLBACK_BULLETS]
        if not chapters:
            return reply(NOT_FOUND)
        lines = [f"- **{c.title}** ({clock(c.start_ms)}): {c.summary}" for c in chapters]
        citations = [cite(seg) for c in chapters if (seg := _segment_at(ctx.segments, c.start_ms))]
    ideas = _suggested_keywords(ctx)
    text = "I couldn't find that exact topic in this meeting. Here's what was covered:\n\n" + "\n".join(lines)
    if ideas:
        text += "\n\nTry asking about: " + ", ".join(f"**{k}**" for k in ideas)
    return reply(text, citations)


def _suggested_keywords(ctx: Meeting, count: int = 3) -> list[str]:
    """Three topics from the meeting itself: the summary keywords, else its most frequent content words."""
    summary = ctx.detail.summary
    if summary and summary.keywords:
        return summary.keywords[:count]
    freq: dict[str, int] = {}
    for seg in ctx.segments:
        for w in words(seg.text):
            if len(w) >= 4 and w not in STOPWORDS:
                freq[w] = freq.get(w, 0) + 1
    return [w for w, _ in sorted(freq.items(), key=lambda kv: (-kv[1], kv[0]))[:count]]

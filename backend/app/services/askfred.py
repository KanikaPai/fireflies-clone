"""AskFred: answer a question about one meeting, using only that meeting's content.

With ``ANTHROPIC_API_KEY`` set, Claude answers from the summary + transcript and cites segment ids as ``[#id]``
(ids that do not exist in this meeting are dropped). On any error, or with no key, a deterministic heuristic engine
answers from the database: action items, summary points, a follow-up email template, a speaker's lines, or a keyword
search over the transcript. The heuristic engine only quotes or lists what is in the meeting; it never invents text.
"""

import logging
import math
import os
import re
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.models import User
from app.schemas.askfred import AskRequest, AskResponse, Citation
from app.schemas.meeting import MeetingDetail
from app.schemas.transcript import SegmentOut
from app.services import meetings, transcript
from app.services.export import clock

logger = logging.getLogger(__name__)

DEFAULT_MODEL = "claude-sonnet-5-5"
LLM_TIMEOUT_SECONDS = 30.0
MAX_CONTEXT_CHARS = 150_000
MAX_CITATIONS = 8
NOT_FOUND = "I couldn't find that in this meeting's transcript."


@dataclass(frozen=True)
class _Meeting:
    detail: MeetingDetail
    segments: list[SegmentOut]
    user_name: str

    @property
    def by_id(self) -> dict[int, SegmentOut]:
        return {s.id: s for s in self.segments}


def _cite(segment: SegmentOut) -> Citation:
    return Citation(segment_id=segment.id, start_ms=segment.start_ms, speaker=segment.speaker)


def _segment_at(segments: list[SegmentOut], ms: int) -> SegmentOut | None:
    """The segment playing at `ms` (the last one starting at or before it)."""
    best = None
    for s in segments:
        if s.start_ms <= ms:
            best = s
        else:
            break
    return best or (segments[0] if segments else None)


def _dedupe(citations: list[Citation]) -> list[Citation]:
    seen: set[int] = set()
    out = []
    for c in citations:
        if c.segment_id not in seen:
            seen.add(c.segment_id)
            out.append(c)
    return out[:MAX_CITATIONS]


# --- entry point ----------------------------------------------------------------------------------


def ask(db: Session, user: User, meeting_id: int, data: AskRequest) -> AskResponse:
    detail = meetings.get_meeting_detail(db, user, meeting_id)
    segments = transcript.get_transcript(db, user, meeting_id, None).segments
    ctx = _Meeting(detail, segments, user.name)
    if os.getenv("ANTHROPIC_API_KEY", "").strip():
        try:
            return _ask_llm(ctx, data)
        except Exception:  # timeout, network, API error, empty answer: never fail the chat because of the model
            logger.warning("AskFred model call failed; using the built-in answer engine", exc_info=True)
    return answer_heuristically(ctx, data.question)


# --- LLM path -------------------------------------------------------------------------------------

_SYSTEM_PROMPT = """You are AskFred, an assistant that answers questions about ONE meeting.
Answer ONLY from the meeting material below (summary, action items and transcript). If the answer is not there,
say you couldn't find it in this meeting; never guess or add outside knowledge.
Write concise Markdown (short paragraphs, bullet lists, **bold** for key terms). No HTML.
Every transcript line starts with its id, like [#123]. When a statement is supported by a transcript line, cite it
by writing its id in square brackets with a hash, exactly like [#123], right after the statement. Cite only ids
that appear in the transcript."""

_CITATION = re.compile(r"\s*\[#(\d+)\]")


def _llm_context(ctx: _Meeting) -> str:
    d = ctx.detail
    parts = [
        f"Meeting: {d.title} ({d.meeting_date:%Y-%m-%d})",
        "Participants: " + ", ".join(p.name for p in d.participants),
    ]
    if d.summary:
        parts.append("Summary: " + d.summary.overview)
        parts += [f"- {b.label}: {b.text}" for b in d.summary.bullets]
    if d.action_items:
        parts.append("Action items:")
        parts += [
            f"- {'[done] ' if a.is_completed else ''}{a.text}"
            + (f" (owner: {a.assignee.name})" if a.assignee else "")
            + (f" (due {a.due_date})" if a.due_date else "")
            for a in d.action_items
        ]
    header = "\n".join(parts) + "\n\nTranscript:\n"
    lines: list[str] = []
    total = len(header)
    for s in ctx.segments:
        line = f"[#{s.id}] {s.speaker.name} ({clock(s.start_ms)}): {s.text}"
        total += len(line) + 1
        if total > MAX_CONTEXT_CHARS:
            lines.append("[transcript truncated]")
            break
        lines.append(line)
    return header + "\n".join(lines)


def _complete_llm(system: str, messages: list[dict[str, str]]) -> str:
    import anthropic  # imported lazily so the heuristic path never needs the SDK

    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"].strip(), timeout=LLM_TIMEOUT_SECONDS, max_retries=1)
    message = client.messages.create(
        model=os.getenv("ANTHROPIC_MODEL", DEFAULT_MODEL), max_tokens=1500, system=system, messages=messages
    )
    return "".join(block.text for block in message.content if block.type == "text")


def _ask_llm(ctx: _Meeting, data: AskRequest) -> AskResponse:
    history = [{"role": m.role, "content": m.content} for m in data.history if m.content.strip()]
    while history and history[0]["role"] != "user":  # the API requires the conversation to start with a user turn
        history.pop(0)
    messages: list[dict[str, str]] = []
    for m in history:  # and to alternate: merge consecutive turns of the same role
        if messages and messages[-1]["role"] == m["role"]:
            messages[-1]["content"] += "\n\n" + m["content"]
        else:
            messages.append(dict(m))
    if messages and messages[-1]["role"] == "user":
        messages.pop()  # a dangling user turn would clash with the new question
    messages.append({"role": "user", "content": data.question})
    system = f"{_SYSTEM_PROMPT}\n\n{_llm_context(ctx)}"
    return parse_llm_answer(_complete_llm(system, messages), ctx.by_id)


def parse_llm_answer(raw: str, by_id: dict[int, SegmentOut]) -> AskResponse:
    """Pull `[#id]` citations out of the model's text; ids that are not segments of this meeting are dropped."""
    ids = [int(m.group(1)) for m in _CITATION.finditer(raw)]
    answer = _CITATION.sub("", raw).strip()
    if not answer:
        raise ValueError("The model returned an empty answer")
    citations = _dedupe([_cite(by_id[i]) for i in ids if i in by_id])
    return AskResponse(answer_markdown=answer, citations=citations, source="llm")


# --- heuristic engine -----------------------------------------------------------------------------

_EMAIL = re.compile(r"\b(e-?mail|follow[- ]?ups?|recap)\b", re.I)
_ACTIONS = re.compile(r"\b(action items?|actions|tasks?|to[- ]?dos?|next steps?|assigned|owners?|deliverables?)\b", re.I)
_SUMMARY = re.compile(r"\b(summar\w*|key (points?|takeaways?|decisions?)|decisions?|decided|takeaways?|highlights?|overview|tl;?dr)\b", re.I)
_SPEAKER_CUE = re.compile(r"\b(say|said|says|mention\w*|points?|think|thought|talk\w*|discuss\w*|share\w*|rais\w*|comment\w*|view|opinion|suggest\w*)\b", re.I)

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


def _words(text: str) -> list[str]:
    return re.findall(r"[A-Za-z0-9']+", text.lower())


def _first_names(name: str) -> set[str]:
    return {t for t in re.findall(r"[A-Za-z]+", name.lower()) if len(t) >= 3}


def _quote(segment: SegmentOut, excerpt: str) -> str:
    return f'> "{excerpt}"\n> — **{segment.speaker.name}** ({clock(segment.start_ms)})'


def _best_excerpt(text: str, stems: set[str], limit: int = 280) -> str:
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    best = max(sentences, key=lambda s: len({_stem(w) for w in _words(s)} & stems)) if stems else sentences[0]
    return best if len(best) <= limit else best[: limit - 1].rstrip() + "…"


def answer_heuristically(ctx: _Meeting, question: str) -> AskResponse:
    def reply(text: str, citations: list[Citation] | None = None) -> AskResponse:
        return AskResponse(answer_markdown=text, citations=_dedupe(citations or []), source="heuristic")

    d = ctx.detail
    if not ctx.segments and not d.summary and not d.action_items:
        return reply("This meeting has no transcript yet, so there is nothing to answer from.")
    if _EMAIL.search(question):
        return reply(_follow_up_email(ctx))
    if _ACTIONS.search(question):
        return _action_items(ctx, reply)
    if _SUMMARY.search(question):
        return _summary_points(ctx, reply)
    speaker = _speaker_in(question, ctx)
    if speaker is not None and _SPEAKER_CUE.search(question):
        return _speaker_lines(ctx, question, speaker, reply)
    return _keyword_answer(ctx, question, reply)


def _speaker_in(question: str, ctx: _Meeting):  # type: ignore[no-untyped-def]
    q_words = set(_words(question)) | {w.removesuffix("'s") for w in _words(question)}
    speakers = {s.speaker.id: s.speaker for s in ctx.segments}
    for person in speakers.values():
        if q_words & _first_names(person.name):
            return person
    return None


def _action_items(ctx: _Meeting, reply):  # type: ignore[no-untyped-def]
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
            citations.append(_cite(by_id[a.source_segment_id]))
    open_count = sum(1 for a in items if not a.is_completed)
    intro = f"Here are the action items from **{ctx.detail.title}** ({open_count} open, {len(items) - open_count} done):"
    return reply(intro + "\n\n" + "\n".join(lines), citations)


def _summary_points(ctx: _Meeting, reply):  # type: ignore[no-untyped-def]
    summary = ctx.detail.summary
    if summary is None or not summary.bullets:
        if ctx.detail.chapters:
            lines = [f"- **{c.title}** ({clock(c.start_ms)}): {c.summary}" for c in ctx.detail.chapters if c.summary]
            return reply(f"Here is the outline of **{ctx.detail.title}**:\n\n" + "\n".join(lines))
        return reply("No summary is available for this meeting yet.")
    lines = [f"- **{b.label}:** {b.text} ({clock(b.start_ms)})" for b in summary.bullets]
    citations = [_cite(s) for b in summary.bullets if (s := _segment_at(ctx.segments, b.start_ms))]
    text = f"Here are the key points and decisions from **{ctx.detail.title}**:\n\n" + "\n".join(lines)
    return reply(text, citations)


def _follow_up_email(ctx: _Meeting) -> str:
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


def _speaker_lines(ctx: _Meeting, question: str, person, reply):  # type: ignore[no-untyped-def]
    mine = [s for s in ctx.segments if s.speaker.id == person.id]
    name_stems = {_stem(w) for w in _first_names(person.name)}
    topic = _topic_stems(question) - name_stems
    scored = sorted(mine, key=lambda s: (-_overlap(s, topic), -len(s.text)))
    if topic and _overlap(scored[0], topic) == 0:
        return reply(f"I couldn't find {person.name} saying anything about that in this meeting's transcript.")
    top = sorted(scored[:3], key=lambda s: s.start_ms)
    blocks = [_quote(s, _best_excerpt(s.text, topic)) for s in top]
    shown = ", ".join(dict.fromkeys(w for w in _words(question) if w not in _STOPWORDS and len(w) >= 3 and _stem(w) in topic))
    about = f" about **{shown}**" if topic else ""
    return reply(f"Here's what **{person.name}** said{about}:\n\n" + "\n\n".join(blocks), [_cite(s) for s in top])


def _topic_stems(question: str) -> set[str]:
    return {_stem(w) for w in _words(question) if w not in _STOPWORDS and len(w) >= 3 and not w.endswith("'s")}


def _overlap(segment: SegmentOut, stems: set[str]) -> int:
    return len(stems & {_stem(w) for w in _words(segment.text)})


def _keyword_answer(ctx: _Meeting, question: str, reply):  # type: ignore[no-untyped-def]
    terms = [t for t in dict.fromkeys(_stem(w) for w in _words(question) if w not in _STOPWORDS and len(w) >= 3)]
    if not terms:
        return reply(NOT_FOUND)
    groups = [(t, next((g - {t} for g in _SYN_STEMS if t in g), set())) for t in terms]  # (term, synonyms)
    seg_stems = [{_stem(w) for w in _words(s.text)} for s in ctx.segments]
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
        return reply(NOT_FOUND)
    top = sorted(sorted(scored, key=lambda x: (-x[0], x[1]))[:3], key=lambda x: x[1])
    match_stems = set(terms) | {s for _, syns in groups for s in syns}
    blocks, cites = [], []
    for _, i in top:
        seg = ctx.segments[i]
        blocks.append(_quote(seg, _best_excerpt(seg.text, match_stems)))
        cites.append(_cite(seg))
    shown = ", ".join(w for w in dict.fromkeys(w for w in _words(question) if w not in _STOPWORDS and len(w) >= 3))
    return reply(f"Here's what was discussed about **{shown}**:\n\n" + "\n\n".join(blocks), cites)

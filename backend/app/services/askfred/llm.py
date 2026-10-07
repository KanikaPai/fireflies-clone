"""The Claude path: build the prompt from the meeting, call the model, parse and validate `[#id]` citations."""

import os
import re

from app.schemas.askfred import AskRequest, AskResponse
from app.schemas.transcript import SegmentOut
from app.services.export import clock

from .common import Meeting, cite, dedupe

DEFAULT_MODEL = "claude-sonnet-5-5"
LLM_TIMEOUT_SECONDS = 30.0
MAX_CONTEXT_CHARS = 150_000

_SYSTEM_PROMPT = """You are AskFred, an assistant that answers questions about ONE meeting.
Answer ONLY from the meeting material below (summary, action items and transcript). If the answer is not there,
say you couldn't find it in this meeting; never guess or add outside knowledge.
Write concise Markdown (short paragraphs, bullet lists, **bold** for key terms). No HTML.
Every transcript line starts with its id, like [#123]. When a statement is supported by a transcript line, cite it
by writing its id in square brackets with a hash, exactly like [#123], right after the statement. Cite only ids
that appear in the transcript."""

_CITATION = re.compile(r"\s*\[#(\d+)\]")


def _llm_context(ctx: Meeting) -> str:
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


def ask_llm(ctx: Meeting, data: AskRequest) -> AskResponse:
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
    citations = dedupe([cite(by_id[i]) for i in ids if i in by_id])
    return AskResponse(answer_markdown=answer, citations=citations, source="llm")

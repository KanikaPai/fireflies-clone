"""Answers to common questions that come straight from meeting metadata (no transcript search)."""

from app.schemas.askfred import AskResponse
from app.services.insights import SegmentView, speaker_stats

from .common import Meeting, cite, reply


def _duration_text(seconds: int) -> str:
    h, rest = divmod(seconds, 3600)
    m, s = divmod(rest, 60)
    if h:
        return f"{h} h {m} min"
    if m:
        return f"{m} min" + (f" {s} s" if s and m < 10 else "")
    return f"{s} s"


def participants(ctx: Meeting) -> AskResponse:
    people = ctx.detail.participants
    if not people:
        return reply("No participants are recorded for this meeting.")
    lines = [f"- **{p.name}**" + (" (host)" if p.role.value == "host" else "") for p in people]
    return reply(f"**{ctx.detail.title}** had {len(people)} participant{'s' if len(people) != 1 else ''}:\n\n" + "\n".join(lines))


def duration(ctx: Meeting) -> AskResponse:
    seconds = ctx.detail.duration_seconds
    if seconds <= 0:
        return reply("This meeting has no recorded duration.")
    return reply(f"**{ctx.detail.title}** ran for **{_duration_text(seconds)}** ({seconds // 60}:{seconds % 60:02d}).")


def when(ctx: Meeting) -> AskResponse:
    d = ctx.detail.meeting_date
    return reply(f"**{ctx.detail.title}** took place on **{d:%A, %B} {d.day}, {d:%Y}** at **{d:%H:%M} UTC**.")


def talk_time(ctx: Meeting) -> AskResponse:
    if not ctx.segments:
        return reply("There is no transcript, so talk time can't be worked out.")
    views = [SegmentView(s.id, s.speaker.id, s.start_ms, s.end_ms, s.text) for s in ctx.segments]
    names = {s.speaker.id: s.speaker.name for s in ctx.segments}
    stats = speaker_stats(views)
    lines = [f"- **{names[st.speaker_id]}**: {st.talk_time_pct}% of the talk time ({st.segment_count} turns, ~{st.wpm} words/min)" for st in stats]
    first = next(s for s in ctx.segments if s.speaker.id == stats[0].speaker_id)
    return reply(f"**{names[stats[0].speaker_id]}** spoke the most. Talk time in **{ctx.detail.title}**:\n\n" + "\n".join(lines), [cite(first)])

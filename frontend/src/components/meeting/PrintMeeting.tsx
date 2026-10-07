"use client";

import { format } from "date-fns";
import { Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { formatDuration } from "@/components/common/formatters";
import { useMeeting, useTranscript } from "@/hooks/useMeeting";
import { formatClock } from "@/lib/player/timeFormat";

/**
 * /meetings/[id]/print: summary, notes, action items and transcript as a clean document. Opens the browser's
 * print dialog once loaded ("Save as PDF" there). Always black on white, whatever the app theme.
 */
export function PrintMeeting() {
  const id = Number(useParams<{ id: string }>().id);
  const meeting = useMeeting(id);
  const transcript = useTranscript(id);
  const printed = useRef(false);
  const ready = Boolean(meeting.data && transcript.data);

  useEffect(() => {
    if (!ready || printed.current) return;
    printed.current = true;
    const timer = setTimeout(() => window.print(), 400); // let the layout settle first
    return () => clearTimeout(timer);
  }, [ready]);

  if (meeting.error || transcript.error) return <p className="p-10 text-sm">Couldn&apos;t load this meeting. It may have been deleted.</p>;
  if (!meeting.data || !transcript.data) return <p className="p-10 text-sm text-neutral-500">Preparing document…</p>;

  const m = meeting.data;
  const segments = transcript.data.segments;

  return (
    <>
      <style>{`@page { margin: 16mm; } @media print { body { background: #fff !important; } }`}</style>
      <div className="mx-auto max-w-[800px] px-6 py-8 font-sans text-[13px] leading-relaxed print:max-w-none print:p-0">
        <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
          <Link href={`/meetings/${m.id}`} className="text-sm text-neutral-600 hover:underline">
            ← Back to meeting
          </Link>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white">
            <Printer className="size-4" aria-hidden="true" /> Print / Save as PDF
          </button>
        </div>

        <h1 className="font-heading text-2xl font-semibold">{m.title}</h1>
        <p className="mt-1 text-neutral-600">
          {format(new Date(m.meeting_date), "EEEE, MMM d, yyyy · h:mm a")} · {formatDuration(m.duration_seconds)}
        </p>
        {m.participants.length > 0 && <p className="text-neutral-600">Participants: {m.participants.map((p) => p.name).join(", ")}</p>}
        {m.tags.length > 0 && <p className="text-neutral-600">Tags: {m.tags.map((t) => t.name).join(", ")}</p>}

        {m.summary && (
          <Section title="Summary">
            <p>{m.summary.overview}</p>
            {m.summary.bullets.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {m.summary.bullets.map((b) => (
                  <li key={b.start_ms} className="break-inside-avoid">
                    <strong>{b.label}:</strong> {b.text} <span className="text-neutral-500">({formatClock(b.start_ms)})</span>
                  </li>
                ))}
              </ul>
            )}
            {m.summary.keywords.length > 0 && <p className="mt-2 text-neutral-600">Keywords: {m.summary.keywords.join(", ")}</p>}
          </Section>
        )}

        {m.chapters.length > 0 && (
          <Section title="Notes">
            {m.chapters.map((chapter) => (
              <div key={chapter.id} className="mb-3 break-inside-avoid">
                <h3 className="font-semibold">
                  {chapter.title} <span className="font-normal text-neutral-500">({formatClock(chapter.start_ms)})</span>
                </h3>
                {chapter.summary && <p>{chapter.summary}</p>}
                {chapter.points.length > 0 && (
                  <ul className="list-disc pl-5">
                    {chapter.points.map((p) => (
                      <li key={p.start_ms}>{p.text}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </Section>
        )}

        {m.action_items.length > 0 && (
          <Section title="Action items">
            <ul className="space-y-1">
              {m.action_items.map((item) => (
                <li key={item.id} className="break-inside-avoid">
                  <span aria-hidden="true">{item.is_completed ? "☑" : "☐"}</span> {item.text}
                  <span className="text-neutral-500">
                    {item.assignee ? ` — ${item.assignee.name}` : ""}
                    {item.due_date ? ` (due ${item.due_date})` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Transcript">
          {segments.length === 0 && <p className="text-neutral-500">No transcript.</p>}
          {segments.map((s) => (
            <p key={s.id} className="mb-2 break-inside-avoid">
              <strong>{s.speaker.name}</strong> <span className="text-neutral-500">[{formatClock(s.start_ms)}]</span>
              <br />
              {s.text}
            </p>
          ))}
        </Section>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 border-b border-neutral-300 pb-1 font-heading text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

"use client";

import { PersonAvatar } from "@/components/common/PersonAvatar";
import type { SpeakerInsight } from "@/lib/api/types";
import { cn } from "@/lib/utils";

import { useTranscriptFilter } from "./TranscriptFilter";

/** Small ring showing a percentage. The ring colour is the speaker's avatar colour (data, not theme). */
function Ring({ pct, color }: { pct: number; color: string }) {
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 24 24" className="size-6 -rotate-90" aria-hidden="true">
      <circle cx="12" cy="12" r={radius} fill="none" strokeWidth="3" className="stroke-surface-sunken" />
      <circle
        cx="12"
        cy="12"
        r={radius}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        stroke={color}
        strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
      />
    </svg>
  );
}

/** SPEAKERS / WPM / TALKTIME table; clicking a speaker filters the transcript to them. */
export function TalkTimeTable({ speakers }: { speakers: SpeakerInsight[] }) {
  const { filter, toggleFilter } = useTranscriptFilter();
  return (
    <table className="w-full text-left text-[13px]">
      <caption className="sr-only">Speaker talk time</caption>
      <thead>
        <tr className="text-[10px] tracking-wider text-text-tertiary uppercase">
          <th scope="col" className="pb-2 font-medium">Speakers</th>
          <th scope="col" className="pb-2 font-medium">WPM</th>
          <th scope="col" className="pb-2 text-right font-medium">Talktime</th>
        </tr>
      </thead>
      <tbody>
        {speakers.map(({ person, wpm, talk_time_pct }) => {
          const active = filter?.kind === "speaker" && filter.personId === person.id;
          return (
            <tr key={person.id}>
              <td colSpan={3} className="p-0">
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleFilter({ kind: "speaker", personId: person.id, label: person.name })}
                  className={cn("grid w-full grid-cols-[1fr_3rem_4.5rem] items-center gap-2 rounded-md px-1.5 py-1.5 text-left hover:bg-surface-hover", active && "bg-brand-soft")}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <PersonAvatar name={person.name} color={person.avatar_color} size="sm" className="rounded-[4px]" />
                    <span className="truncate text-text-primary">{person.name}</span>
                  </span>
                  <span className="text-text-secondary tabular-nums">{wpm}</span>
                  <span className="flex items-center justify-end gap-1.5 text-text-secondary tabular-nums">
                    <Ring pct={talk_time_pct} color={person.avatar_color} />
                    {talk_time_pct}%
                  </span>
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

"use client";

import { CheckSquare, FileText, ListChecks, MessageSquareText, Search, Square } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { formatDate } from "@/components/common/formatters";
import { PersonAvatar } from "@/components/common/PersonAvatar";
import { SafeSnippet } from "@/components/common/SafeSnippet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearch } from "@/hooks/useSearch";
import type { SearchResponse } from "@/lib/api/types";
import { formatClock } from "@/lib/player/timeFormat";
import { meetingSearchHref, termFromSnippet } from "@/lib/snippet";
import { cn } from "@/lib/utils";

const TABS = ["all", "meetings", "transcripts", "action-items"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = { all: "All", meetings: "Meetings", transcripts: "Transcripts", "action-items": "Action items" };

type Result = SearchResponse["results"][number];

/** Counts shown on the tabs. Transcript count is the number of matching segments across meetings. */
function tabCounts(data: SearchResponse): Record<Tab, number> {
  const meetings = data.results.filter((r) => r.title_match).length + data.summary_bullets_total;
  const transcripts = data.results.reduce((sum, r) => sum + r.match_count, 0);
  return { all: meetings + transcripts + data.action_items_total, meetings, transcripts, "action-items": data.action_items_total };
}

/** /search?q=: results for meeting titles and notes, transcripts (grouped by meeting) and action items. */
export function SearchPage() {
  const params = useSearchParams();
  const router = useRouter();
  const q = (params.get("q") ?? "").trim();
  const requested = params.get("tab");
  const tab: Tab = TABS.includes(requested as Tab) ? (requested as Tab) : "all";
  const { data, isPending, error, refetch } = useSearch(q, { limit: 50, matches_per_meeting: 10, per_category: 50 });

  const setTab = (next: Tab) => {
    const search = new URLSearchParams(params.toString());
    if (next === "all") search.delete("tab");
    else search.set("tab", next);
    router.replace(`/search?${search.toString()}`, { scroll: false });
  };

  if (!q) {
    return (
      <EmptyState
        icon={Search}
        title="Search your meetings"
        description="Find anything said in a meeting, a meeting by its title, or an action item. Type in the search box above."
      />
    );
  }
  if (error) return <ErrorState title="Search failed" message={error.message} onRetry={() => void refetch()} />;
  if (isPending || !data) {
    return (
      <div aria-busy="true" className="mx-auto max-w-4xl space-y-3 px-6 py-6">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const counts = tabCounts(data);
  if (counts.all === 0) {
    return (
      <EmptyState
        icon={Search}
        title={`No results for “${q}”`}
        description="Check the spelling, try fewer or different words, or search for part of a word."
        action={
          <Button asChild variant="soft">
            <Link href="/meetings">Browse all meetings</Link>
          </Button>
        }
      />
    );
  }

  const titleMatches = data.results.filter((r) => r.title_match);
  const withTranscript = data.results.filter((r) => r.matches.length > 0);
  const show = (section: Tab) => tab === "all" || tab === section;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
      <h1 className="mb-1 text-xl font-medium text-text-primary">Results for “{q}”</h1>
      <div role="tablist" aria-label="Result types" className="mt-3 mb-6 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((key) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap",
              tab === key ? "border-brand text-brand" : "border-transparent text-text-secondary hover:text-text-primary",
            )}
          >
            {TAB_LABELS[key]}
            <span className="rounded-full bg-surface-sunken px-1.5 text-xs tabular-nums text-text-secondary">{counts[key]}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" className="space-y-8">
        {show("meetings") && (titleMatches.length > 0 || data.summary_bullets.length > 0) && (
          <Section icon={FileText} title="Meetings">
            <ul className="space-y-2">
              {titleMatches.map((r) => (
                <li key={r.meeting.id}>
                  <Link href={meetingSearchHref(r.meeting.id, null)} className="block rounded-lg border border-border bg-surface px-4 py-3 hover:bg-surface-hover">
                    <p className="font-medium text-text-primary">{r.meeting.title}</p>
                    <p className="text-xs text-text-tertiary">{formatDate(r.meeting.meeting_date)}</p>
                  </Link>
                </li>
              ))}
              {data.summary_bullets.map((b, i) => (
                <li key={`${b.meeting.id}-${b.start_ms}-${i}`}>
                  <Link href={meetingSearchHref(b.meeting.id, b.start_ms)} className="block rounded-lg border border-border bg-surface px-4 py-3 hover:bg-surface-hover">
                    <p className="text-xs text-text-tertiary">Notes · {b.meeting.title} · {formatClock(b.start_ms)}</p>
                    <SafeSnippet snippet={b.snippet} className="mt-0.5 block text-sm text-text-primary" />
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {show("transcripts") && withTranscript.length > 0 && (
          <Section icon={MessageSquareText} title="Transcripts">
            <div className="space-y-4">
              {withTranscript.map((r) => (
                <TranscriptGroup key={r.meeting.id} result={r} term={q} />
              ))}
            </div>
          </Section>
        )}

        {show("action-items") && data.action_items.length > 0 && (
          <Section icon={ListChecks} title="Action items">
            <ul className="space-y-2">
              {data.action_items.map((a) => (
                <li key={a.id}>
                  <Link
                    href={meetingSearchHref(a.meeting.id, a.source_start_ms)}
                    className="flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3 hover:bg-surface-hover"
                  >
                    {a.is_completed ? <CheckSquare className="mt-0.5 size-4 shrink-0 text-success" aria-label="Completed" /> : <Square className="mt-0.5 size-4 shrink-0 text-text-tertiary" aria-label="Open" />}
                    <span className="min-w-0 flex-1">
                      <SafeSnippet snippet={a.snippet} className={cn("block text-sm text-text-primary", a.is_completed && "text-text-secondary line-through")} />
                      <span className="mt-0.5 block text-xs text-text-tertiary">
                        {a.meeting.title} · {formatDate(a.meeting.meeting_date)}
                        {a.assignee ? ` · ${a.assignee.name}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {tab !== "all" && counts[tab] === 0 && <p className="py-10 text-center text-sm text-text-tertiary">No {TAB_LABELS[tab].toLowerCase()} match “{q}”.</p>}
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof FileText; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-text-secondary">
        <Icon className="size-4" aria-hidden="true" /> {title}
      </h2>
      {children}
    </section>
  );
}

function TranscriptGroup({ result, term }: { result: Result; term: string }) {
  const { meeting, matches, match_count } = result;
  return (
    <article className="overflow-hidden rounded-lg border border-border bg-surface">
      <header className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-2.5">
        <Link href={meetingSearchHref(meeting.id, null)} className="truncate font-medium text-text-primary hover:text-brand hover:underline">
          {meeting.title}
        </Link>
        <span className="shrink-0 text-xs text-text-tertiary">
          {formatDate(meeting.meeting_date)} · {match_count} {match_count === 1 ? "match" : "matches"}
        </span>
      </header>
      <ul>
        {matches.map((m) => (
          <li key={m.segment_id} className="border-b border-border last:border-b-0">
            <Link href={meetingSearchHref(meeting.id, m.start_ms, termFromSnippet(m.snippet, term))} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-hover">
              <PersonAvatar name={m.speaker.name} color={m.speaker.avatar_color} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-xs text-text-tertiary">
                  <span className="font-medium text-text-secondary">{m.speaker.name}</span>
                  <span className="tabular-nums">{formatClock(m.start_ms)}</span>
                </span>
                <SafeSnippet snippet={m.snippet} className="mt-0.5 block text-sm text-text-primary" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}

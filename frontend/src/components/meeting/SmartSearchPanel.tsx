"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { useInsights } from "@/hooks/useMeeting";
import { cn } from "@/lib/utils";

import { CollapsibleSection } from "./Collapsible";
import { TalkTimeTable } from "./TalkTimeTable";
import { sameFilter, useTranscriptFilter } from "./TranscriptFilter";

const CATEGORY_DOT: Record<string, string> = {
  date_time: "bg-chart-2",
  metrics: "bg-chart-3",
  questions: "bg-chart-5",
  tasks: "bg-chart-4",
  pricing: "bg-chart-1",
};

export function SmartSearchPanel({ meetingId }: { meetingId: number }) {
  const { data, isPending, error, refetch } = useInsights(meetingId);
  const { filter, toggleFilter } = useTranscriptFilter();

  if (isPending) {
    return (
      <div aria-busy="true" className="space-y-3 p-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }
  if (error) return <ErrorState title="Couldn't load insights" message={error.message} onRetry={() => void refetch()} />;

  const { filters, sentiment, speakers } = data;
  const sentiments = [
    { label: "Positive", pct: sentiment.positive_pct, dot: "bg-success" },
    { label: "Neutral", pct: sentiment.neutral_pct, dot: "bg-text-tertiary" },
    { label: "Negative", pct: sentiment.negative_pct, dot: "bg-danger" },
  ];

  return (
    <div>
      <CollapsibleSection title="AI Filters">
        <ul className="grid grid-cols-2 gap-1.5">
          {filters.map((category) => {
            const next = { kind: "category", key: category.key, label: `${category.label} (${category.count})` } as const;
            const active = sameFilter(filter, next);
            return (
              <li key={category.key}>
                <button
                  type="button"
                  disabled={category.count === 0}
                  aria-pressed={active}
                  onClick={() => toggleFilter(next)}
                  className={cn(
                    "flex w-full items-center gap-1.5 rounded-md bg-surface-subtle px-2 py-2 text-left text-[12.5px] text-text-secondary transition-colors hover:bg-surface-sunken disabled:opacity-50 disabled:hover:bg-surface-subtle",
                    active && "bg-brand-soft text-brand-soft-foreground ring-1 ring-brand/40",
                  )}
                >
                  <span className={cn("size-1.5 shrink-0 rounded-full", CATEGORY_DOT[category.key])} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{category.label}</span>
                  <span className="text-xs text-text-tertiary tabular-nums">{category.count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </CollapsibleSection>

      <CollapsibleSection title="Sentiments">
        <ul className="space-y-1">
          {sentiments.map(({ label, pct, dot }) => (
            <li key={label} className="flex items-center gap-2 rounded-md bg-surface-subtle px-2.5 py-2 text-[13px] text-text-secondary">
              <span className={cn("size-1.5 rounded-full", dot)} aria-hidden="true" />
              <span className="flex-1">{label}</span>
              <span className="text-text-tertiary tabular-nums">{pct}%</span>
            </li>
          ))}
        </ul>
      </CollapsibleSection>

      <CollapsibleSection title="Speaker Talktime">
        <TalkTimeTable speakers={speakers} />
      </CollapsibleSection>
    </div>
  );
}

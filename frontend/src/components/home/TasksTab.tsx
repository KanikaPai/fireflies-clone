"use client";

import { ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { formatDate, pluralize } from "@/components/common/formatters";
import { ActionItemRow } from "@/components/action-items/ActionItemRow";
import { Skeleton } from "@/components/ui/skeleton";
import { useActionItems } from "@/hooks/useActionItems";
import type { ActionItemWithMeeting } from "@/lib/api/types";
import { formatClock } from "@/lib/player/timeFormat";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "open" | "completed";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "completed", label: "Completed" },
];

interface MeetingTasks {
  meetingId: number;
  title: string;
  date: string;
  items: ActionItemWithMeeting[];
}

/** Tasks: every action item across meetings, grouped by meeting; checkboxes toggle completion. */
export function TasksTab() {
  const { data, isPending, error, refetch } = useActionItems();
  const [status, setStatus] = useState<StatusFilter>("all");

  const { groups, openCount } = useMemo(() => {
    const items = (data ?? []).filter((i) => (status === "all" ? true : status === "open" ? !i.is_completed : i.is_completed));
    const byMeeting: MeetingTasks[] = [];
    for (const item of items) {
      const existing = byMeeting.find((g) => g.meetingId === item.meeting_id);
      if (existing) existing.items.push(item);
      else byMeeting.push({ meetingId: item.meeting_id, title: item.meeting_title, date: item.meeting_date, items: [item] });
    }
    return { groups: byMeeting, openCount: (data ?? []).filter((i) => !i.is_completed).length };
  }, [data, status]);

  if (isPending) return <TasksSkeleton />;
  if (error) return <ErrorState title="Couldn't load tasks" message={error.message} onRetry={() => void refetch()} />;
  if (data.length === 0) {
    return <EmptyState icon={ClipboardCheck} title="No tasks yet" description="Action items from your meetings will show up here." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 pb-2">
        <p className="text-sm text-text-secondary" aria-live="polite">
          {pluralize(openCount, "open task")}
        </p>
        <div role="group" aria-label="Filter tasks" className="flex gap-1 rounded-md bg-surface-subtle p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={status === f.value}
              onClick={() => setStatus(f.value)}
              className={cn(
                "rounded px-3 py-1 text-[13px] font-medium transition-colors",
                status === f.value ? "bg-surface text-text-primary shadow-card" : "text-text-secondary hover:text-text-primary",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 && <p className="py-12 text-center text-sm text-text-tertiary">No {status} tasks.</p>}

      <div className="divide-y divide-border">
        {groups.map((group) => (
          <section key={group.meetingId} aria-label={group.title} className="py-5">
            <h3 className="font-sans text-[15px] font-semibold text-text-primary">
              <Link href={`/meetings/${group.meetingId}`} className="hover:text-brand hover:underline">
                {group.title}
              </Link>
            </h3>
            <p className="text-[13px] text-text-tertiary">{formatDate(group.date)}</p>
            <ul className="mt-3 space-y-1">
              {group.items.map((item) => (
                <ActionItemRow
                  key={item.id}
                  item={item}
                  variant="tasks"
                  sourceLink={
                    item.source_start_ms !== null ? (
                      <Link href={`/meetings/${item.meeting_id}?t=${Math.floor(item.source_start_ms / 1000)}`} className="text-info hover:underline">
                        {formatClock(item.source_start_ms)}
                      </Link>
                    ) : null
                  }
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function TasksSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading tasks" className="space-y-4 py-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

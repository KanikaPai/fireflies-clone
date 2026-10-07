"use client";

import { format, parseISO } from "date-fns";
import { CalendarDays, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { formatDate, pluralize } from "@/components/common/formatters";
import { PersonAvatar } from "@/components/common/PersonAvatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useActionItems, useToggleActionItem } from "@/hooks/useActionItems";
import type { ActionItemWithMeeting } from "@/lib/api/types";
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
  const toggle = useToggleActionItem();
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
                <li key={item.id} className="flex items-start gap-3 rounded-md px-2 py-2 hover:bg-surface-hover">
                  <Checkbox
                    id={`task-${item.id}`}
                    checked={item.is_completed}
                    onCheckedChange={(value) => toggle.mutate({ id: item.id, completed: value === true })}
                    className="mt-0.5"
                    aria-label={`Mark "${item.text}" as ${item.is_completed ? "open" : "complete"}`}
                  />
                  <label
                    htmlFor={`task-${item.id}`}
                    className={cn("flex-1 cursor-pointer text-sm leading-relaxed", item.is_completed ? "text-text-tertiary line-through" : "text-text-primary")}
                  >
                    {item.text}
                  </label>
                  <div className="flex shrink-0 items-center gap-3 text-[13px] text-text-tertiary">
                    {item.due_date && (
                      <span className="hidden items-center gap-1 sm:flex">
                        <CalendarDays className="size-3.5" aria-hidden="true" />
                        {format(parseISO(item.due_date), "MMM d")}
                      </span>
                    )}
                    {item.assignee ? (
                      <span className="flex items-center gap-1.5">
                        <PersonAvatar name={item.assignee.name} color={item.assignee.avatar_color} size="sm" />
                        <span className="hidden md:inline">{item.assignee.name}</span>
                      </span>
                    ) : (
                      <span>Unassigned</span>
                    )}
                  </div>
                </li>
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

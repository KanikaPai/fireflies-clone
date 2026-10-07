"use client";

import { useMemo } from "react";

import { PersonAvatar } from "@/components/common/PersonAvatar";
import { ActionItemRow } from "@/components/action-items/ActionItemRow";
import { AddActionItem } from "@/components/action-items/AddActionItem";
import type { ActionItem, Segment } from "@/lib/api/types";

import { TimeLink } from "./TimeLink";

interface Group {
  key: string;
  name: string | null;
  color: string | null;
  items: ActionItem[];
}

/** Group by assignee (alphabetical), unassigned last. */
function groupByAssignee(items: ActionItem[]): Group[] {
  const groups = new Map<string, Group>();
  for (const item of items) {
    const key = item.assignee ? String(item.assignee.id) : "unassigned";
    const group = groups.get(key) ?? { key, name: item.assignee?.name ?? null, color: item.assignee?.avatar_color ?? null, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => (a.name === null ? 1 : b.name === null ? -1 : a.name.localeCompare(b.name)));
}

interface ActionItemsSectionProps {
  meetingId: number;
  items: ActionItem[];
  segments: Segment[];
}

export function ActionItemsSection({ meetingId, items, segments }: ActionItemsSectionProps) {
  const groups = useMemo(() => groupByAssignee(items), [items]);

  return (
    <section aria-labelledby="actions-heading" className="mt-10 pb-8">
      <h2 id="actions-heading" className="font-sans text-[17px] font-medium text-text-secondary">
        Action Items
      </h2>
      {items.length === 0 && <p className="mt-3 text-sm text-text-tertiary">No action items yet. Add one below.</p>}
      <div className="mt-4 space-y-6">
        {groups.map((group) => (
          <div key={group.key}>
            <h3 className="flex items-center gap-2 font-sans text-sm font-semibold text-text-primary">
              {group.name && group.color && <PersonAvatar name={group.name} color={group.color} size="xs" />}
              {group.name ?? "Unassigned"}
            </h3>
            <ul className="mt-2 space-y-1">
              {group.items.map((item) => (
                <ActionItemRow
                  key={item.id}
                  item={item}
                  variant="meeting"
                  sourceLink={item.source_start_ms !== null ? <TimeLink ms={item.source_start_ms} className="text-[13px]" /> : null}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
      <AddActionItem meetingId={meetingId} segments={segments} />
    </section>
  );
}

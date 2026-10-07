"use client";

import { Bell } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const NOTIFICATIONS = [
  { id: 1, title: "Sprint 24 Planning is ready", body: "Your summary and action items are available.", time: "2h ago" },
  { id: 2, title: "New action item assigned", body: "Priya assigned you \"Draft the migration plan\".", time: "Yesterday" },
  { id: 3, title: "Weekly digest", body: "You had 8 meetings and 35 action items this month.", time: "Mon" },
];

export function NotificationsPopover() {
  const [hasUnread, setHasUnread] = useState(true);
  return (
    <Popover onOpenChange={(open) => open && setHasUnread(false)}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={hasUnread ? "Notifications (unread)" : "Notifications"} className="relative text-text-secondary">
          <Bell aria-hidden="true" />
          {hasUnread && <span className="absolute top-1.5 right-2 size-2 rounded-full bg-danger ring-2 ring-surface" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-0 p-0 shadow-popover">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold text-text-primary">Notifications</div>
        <ul className="divide-y divide-border">
          {NOTIFICATIONS.map((n) => (
            <li key={n.id} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-text-primary">{n.title}</p>
                <span className="shrink-0 text-xs text-text-tertiary">{n.time}</span>
              </div>
              <p className="mt-0.5 text-[13px] text-text-secondary">{n.body}</p>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

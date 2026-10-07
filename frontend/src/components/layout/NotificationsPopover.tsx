"use client";

import { AlertCircle, Bell, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications } from "@/hooks/useNotifications";
import type { AppNotification } from "@/lib/notifications";
import { formatDistanceToNow } from "date-fns";

const ICONS = { ready: CheckCircle2, failed: AlertCircle, overdue: Clock } as const;
const TONES = { ready: "text-success", failed: "text-danger", overdue: "text-warning" } as const;

/** Bell with real notifications: meetings ready in the last 24 h, failed meetings and overdue action items. */
export function NotificationsPopover() {
  const { notifications, unread, markOpened } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) markOpened();
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={unread ? "Notifications (unread)" : "Notifications"} className="relative text-text-secondary">
          <Bell aria-hidden="true" />
          {unread && <span data-testid="unread-dot" className="absolute top-1.5 right-2 size-2 rounded-full bg-danger ring-2 ring-surface" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-0 p-0 shadow-popover">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold text-text-primary">Notifications</div>
        {notifications.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-text-tertiary">You&rsquo;re all caught up.</p>
        ) : (
          <ul className="max-h-96 divide-y divide-border overflow-y-auto">
            {notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} onNavigate={() => setOpen(false)} />
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

function NotificationItem({ notification: n, onNavigate }: { notification: AppNotification; onNavigate: () => void }) {
  const Icon = ICONS[n.kind];
  return (
    <li>
      <Link href={n.href} onClick={onNavigate} className="flex gap-3 px-4 py-3 hover:bg-surface-hover">
        <Icon className={`mt-0.5 size-4 shrink-0 ${TONES[n.kind]}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-sm font-medium text-text-primary">{n.title}</p>
            {n.at > 0 && <span className="shrink-0 text-xs text-text-tertiary">{formatDistanceToNow(n.at, { addSuffix: true })}</span>}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[13px] text-text-secondary">{n.body}</p>
        </div>
      </Link>
    </li>
  );
}

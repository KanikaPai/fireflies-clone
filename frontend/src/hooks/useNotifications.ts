import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import { listMeetings } from "@/lib/api/meetings";
import { buildNotifications, hasUnread, type AppNotification } from "@/lib/notifications";
import { recentSince } from "@/lib/processing";

import { queryKeys } from "./queryKeys";
import { useActionItems } from "./useActionItems";

const STORAGE_KEY = "notifications:lastOpened";

function readLastOpened(): number | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? Number(raw) || null : null;
  } catch {
    return null; // storage blocked: behave as "never opened"
  }
}

/** Real notifications (ready, failed, overdue) plus an unread flag based on when the popover was last opened. */
export function useNotifications(): { notifications: AppNotification[]; unread: boolean; markOpened: () => void } {
  const recent = useQuery({
    queryKey: queryKeys.meetings.recent(undefined),
    queryFn: ({ signal }) => listMeetings({ page_size: 50, status: "ready", processed_since: recentSince() }, signal),
  });
  const failed = useQuery({
    queryKey: queryKeys.meetings.list({ page_size: 50, status: "failed" }),
    queryFn: ({ signal }) => listMeetings({ page_size: 50, status: "failed" }, signal),
  });
  const open = useActionItems(false);

  const [lastOpened, setLastOpened] = useState<number | null | undefined>(undefined); // undefined = not read yet
  useEffect(() => setLastOpened(readLastOpened()), []); // eslint-disable-line react-hooks/set-state-in-effect

  const notifications = useMemo(
    () => buildNotifications({ ready: recent.data?.items ?? [], failed: failed.data?.items ?? [], actionItems: open.data ?? [] }),
    [recent.data, failed.data, open.data],
  );
  const markOpened = useCallback(() => {
    const now = Date.now();
    setLastOpened(now);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(now));
    } catch {
      /* storage unavailable: the dot just comes back next visit */
    }
  }, []);

  return { notifications, unread: lastOpened !== undefined && hasUnread(notifications, lastOpened), markOpened };
}

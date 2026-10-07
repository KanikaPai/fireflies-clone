"use client";

import { useSyncExternalStore } from "react";

import { hasSlowRequests, subscribeSlowRequests } from "@/lib/api/slowRequests";

/** Small non-blocking notice shown while an API request is taking unusually long (free-tier cold start). */
export function ServerWakingBanner() {
  const waking = useSyncExternalStore(subscribeSlowRequests, hasSlowRequests, () => false);
  if (!waking) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border border-border bg-surface px-4 py-3 text-center text-sm text-text-secondary shadow-lg"
    >
      Waking up the demo server — this can take up to a minute on the free tier…
    </div>
  );
}

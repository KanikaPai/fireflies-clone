"use client";

import type { ReactNode } from "react";

import { ErrorState } from "@/components/common/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { useAutosaveSettings } from "@/hooks/useAutosaveSettings";
import { useHydrated } from "@/hooks/useHydrated";

/** Settings with a hydration-safe `settings` (undefined until the client has hydrated, so the skeleton matches the server HTML). */
export function useSection() {
  const hydrated = useHydrated();
  const autosave = useAutosaveSettings();
  return { ...autosave, settings: hydrated ? autosave.settings : undefined };
}

export function SectionShell({ children, loading, error, onRetry }: { children: ReactNode; loading: boolean; error: Error | null; onRetry: () => void }) {
  if (error) return <ErrorState title="Couldn't load your settings" message={error.message} onRetry={onRetry} />;
  if (loading) {
    return (
      <div aria-busy="true" className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }
  return <div className="space-y-4">{children}</div>;
}

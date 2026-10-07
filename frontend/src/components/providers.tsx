"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";

import { ThemeSync } from "@/components/common/ThemeSync";
import { ServerWakingBanner } from "@/components/common/ServerWakingBanner";
import { ProcessingWatcher } from "@/components/status/ProcessingWatcher";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api/client";

/** Tracks whether the last input was a pointer or the keyboard so focus rings only show for the keyboard. */
function useInputModality() {
  useEffect(() => {
    const root = document.documentElement;
    const set = (mode: "pointer" | "keyboard") => () => {
      if (root.dataset.input !== mode) root.dataset.input = mode;
    };
    const pointer = set("pointer");
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Tab" || event.key.startsWith("Arrow")) set("keyboard")();
    };
    window.addEventListener("pointerdown", pointer, true);
    window.addEventListener("keydown", keyboard, true);
    return () => {
      window.removeEventListener("pointerdown", pointer, true);
      window.removeEventListener("keydown", keyboard, true);
    };
  }, []);
}

export function Providers({ children }: { children: ReactNode }) {
  useInputModality();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Don't retry client errors (404/422); retry transient failures (network, 5xx while a free-tier
            // server wakes up) 3 times with exponential backoff (1s, 2s, 4s).
            retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 3,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      <ProcessingWatcher />
      <ThemeSync />
      <ServerWakingBanner />
      <Toaster />
    </QueryClientProvider>
  );
}

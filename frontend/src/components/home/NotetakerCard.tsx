"use client";

import { Globe } from "lucide-react";
import Link from "next/link";

import { LogoMark } from "@/components/common/Logo";
import { OptionSelect } from "@/components/settings/OptionSelect";
import { Skeleton } from "@/components/ui/skeleton";
import { useAutosaveSettings } from "@/hooks/useAutosaveSettings";
import { useHydrated } from "@/hooks/useHydrated";
import type { AutoJoin, RecapRecipients } from "@/lib/api/types";
import { AUTO_JOIN_LABELS, RECAP_LABELS } from "@/lib/settings";

const SELECT_CLASS = "h-9 w-full border-transparent bg-surface-subtle text-sm text-text-secondary shadow-none";

/** Notetaker settings card. Reads and writes the same persisted settings as /settings (one shared cache entry). */
export function NotetakerCard() {
  const hydrated = useHydrated();
  const { settings: loaded, change } = useAutosaveSettings();
  const settings = hydrated ? loaded : undefined; // keep the first client render identical to the server HTML

  return (
    <section aria-labelledby="notetaker-heading" className="rounded-xl bg-surface shadow-card">
      <h2 id="notetaker-heading" className="flex items-center gap-2 border-b border-border px-5 py-3.5 font-sans text-sm font-medium text-text-primary">
        <LogoMark className="size-4" />
        Fireflies Notetaker
      </h2>
      {settings ? (
        <>
          <div className="space-y-4 px-5 py-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-text-primary">Auto join calendar meetings</p>
              <OptionSelect
                label="Auto join calendar meetings"
                className={SELECT_CLASS}
                value={settings.auto_join}
                options={(Object.keys(AUTO_JOIN_LABELS) as AutoJoin[]).map((value) => ({ value, label: AUTO_JOIN_LABELS[value] }))}
                onChange={(auto_join) => change({ auto_join })}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-text-primary">Send email recap to</p>
              <OptionSelect
                label="Send email recap to"
                className={SELECT_CLASS}
                value={settings.recap_recipients}
                options={(Object.keys(RECAP_LABELS) as RecapRecipients[]).map((value) => ({ value, label: RECAP_LABELS[value] }))}
                onChange={(recap_recipients) => change({ recap_recipients })}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 border-t border-border px-4 py-3.5 text-[13px] whitespace-nowrap text-text-secondary xl:gap-2.5 xl:px-5 xl:text-sm">
            <Globe className="size-4 text-text-tertiary" aria-hidden="true" />
            Meeting language:
            <Link href="/settings?tab=meeting" className="truncate text-brand underline-offset-2 hover:underline">
              {settings.language}
            </Link>
          </div>
        </>
      ) : (
        <div aria-busy="true" className="space-y-3 px-5 py-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}
    </section>
  );
}

"use client";

import { AudioLines, Plus, Search } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

const TABS = ["My Playlists", "All Playlists"] as const;

/** Playlist shell: the feature itself is Phase 7, so every action shows a Coming Soon toast. */
export function PlaylistPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("My Playlists");
  const create = () => notify.comingSoon("Playlists");

  return (
    <div className="mx-auto max-w-[760px] px-6 py-6">
      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Playlist scope" className="flex gap-2">
          {TABS.map((name) => (
            <button
              key={name}
              role="tab"
              type="button"
              aria-selected={tab === name}
              onClick={() => setTab(name)}
              className={cn(
                "h-8 rounded-full border px-4 text-[13px] transition-colors",
                tab === name ? "border-brand/50 bg-brand-soft text-brand-soft-foreground" : "border-border text-text-secondary hover:bg-surface-hover",
              )}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-56">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
          <Input aria-label="Search playlist" placeholder="Search playlist" className="h-8 pl-8 text-[13px] shadow-none" onChange={() => undefined} />
        </div>
        <Button size="sm" onClick={create}>
          <Plus aria-hidden="true" /> Create playlist
        </Button>
      </div>

      <div className="flex flex-col items-center px-4 pt-20 pb-16 text-center">
        <div aria-hidden="true" className="mb-8 w-44 rounded-lg bg-surface p-4 shadow-card">
          <span className="flex size-5 items-center justify-center rounded bg-brand-soft text-brand">
            <AudioLines className="size-3" />
          </span>
          <div className="mt-6 flex gap-2">
            <span className="h-2 w-10 rounded bg-surface-sunken" />
            <span className="h-2 w-6 rounded bg-surface-sunken" />
          </div>
        </div>
        <h2 className="text-xl font-medium text-text-primary">Organize soundbites with playlists</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
          Playlists helps you keep your favourite soundbites organized and easily sharable across team.
        </p>
        <Button className="mt-6" onClick={create}>
          Create playlist
        </Button>
      </div>
    </div>
  );
}

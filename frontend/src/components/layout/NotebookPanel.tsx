"use client";

import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Hash } from "lucide-react";

import { Input } from "@/components/ui/input";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

import { DEFAULT_NOTEBOOK_VIEW, NOTEBOOK_VIEWS, type NotebookView } from "./nav";

const EXAMPLE_CHANNEL = "Demo Meetings FF";

/** Channel list beside the icon rail on /meetings: views (My / All / Shared / Voice Agent) and channels. */
export function NotebookPanel() {
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState("");
  const currentView = (searchParams.get("view") as NotebookView | null) ?? DEFAULT_NOTEBOOK_VIEW;

  const matches = (label: string) => label.toLowerCase().includes(filter.trim().toLowerCase());
  const views = NOTEBOOK_VIEWS.filter((v) => matches(v.label));
  const showChannel = matches(EXAMPLE_CHANNEL);

  const hrefFor = (view: NotebookView) => {
    const params = new URLSearchParams(searchParams);
    params.delete("page");
    if (view === DEFAULT_NOTEBOOK_VIEW) params.delete("view");
    else params.set("view", view);
    const query = params.toString();
    return query ? `/meetings?${query}` : "/meetings";
  };

  return (
    <aside aria-label="Notebook channels" className="hidden h-full w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="relative border-b border-border px-3 py-3">
        <Search className="pointer-events-none absolute top-1/2 left-6 size-4 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search channels"
          aria-label="Search channels"
          className="border-transparent bg-transparent pl-8 shadow-none"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 py-3">
        <ul className="space-y-0.5">
          {views.map(({ view, label, icon: Icon }) => {
            const active = currentView === view;
            return (
              <li key={view}>
                <Link
                  href={hrefFor(view)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-brand-soft text-brand-soft-foreground"
                      : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
                  )}
                >
                  <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
        {views.length === 0 && !showChannel && <p className="px-3 py-2 text-sm text-text-tertiary">No channels found</p>}

        <div className="mt-3 border-t border-border pt-3">
          <div className="flex h-9 items-center justify-between pr-1 pl-3">
            <span className="text-sm font-medium text-text-secondary">All channels</span>
            <button
              type="button"
              aria-label="Create channel"
              onClick={() => notify.comingSoon("Channels")}
              className="flex size-7 items-center justify-center rounded-md text-text-secondary hover:bg-surface-hover"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </div>
          {showChannel && (
            <div className="flex h-10 items-center gap-3 rounded-md px-3 text-sm text-text-secondary">
              <Hash className="size-[18px] shrink-0" aria-hidden="true" />
              {EXAMPLE_CHANNEL}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

"use client";

import { AudioLines, BookOpen, Bookmark, ChevronsLeft, MessageSquare, Search, Smile, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import type { Chapter } from "@/lib/api/types";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

import { OutlinePanel } from "./OutlinePanel";
import { SmartSearchPanel } from "./SmartSearchPanel";

type PanelKey = "search" | "outline" | "soundbites" | "comments" | "bookmarks";

const PANELS: { key: PanelKey; label: string; icon: LucideIcon }[] = [
  { key: "search", label: "Smart Search", icon: Search },
  { key: "outline", label: "Outline", icon: BookOpen },
  { key: "soundbites", label: "Soundbites", icon: AudioLines },
  { key: "comments", label: "Comments", icon: MessageSquare },
  { key: "bookmarks", label: "Bookmarks", icon: Bookmark },
];

const PLACEHOLDERS: Record<"soundbites" | "comments" | "bookmarks", { icon: LucideIcon; title: string; text: string }> = {
  soundbites: { icon: AudioLines, title: "No soundbites yet", text: "Turn key moments into short, shareable clips. Coming soon." },
  comments: { icon: MessageSquare, title: "No comments yet", text: "Comments left on the transcript will show up here. Coming soon." },
  bookmarks: { icon: Bookmark, title: "No bookmarks yet", text: "Bookmark moments to find them again quickly. Coming soon." },
};

interface LeftPanelProps {
  meetingId: number;
  chapters: Chapter[];
}

/** Thin icon rail plus a collapsible panel; the rail switches the panel's content. */
export function LeftPanel({ meetingId, chapters }: LeftPanelProps) {
  const [active, setActive] = useState<PanelKey>("search");
  // Starts collapsed below the xl breakpoint (this component only mounts client-side, after data loads).
  const [collapsed, setCollapsed] = useState(() => typeof window !== "undefined" && !window.matchMedia("(min-width: 1280px)").matches);

  const select = (key: PanelKey) => {
    if (key === active && !collapsed) setCollapsed(true);
    else {
      setActive(key);
      setCollapsed(false);
    }
  };
  const current = PANELS.find((p) => p.key === active)!;

  return (
    <div className="hidden border-r border-border bg-surface lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:flex">
      <nav aria-label="Meeting tools" className="flex w-12 flex-col items-center gap-1 border-r border-border py-3">
        {PANELS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            aria-label={label}
            aria-pressed={active === key && !collapsed}
            onClick={() => select(key)}
            className={cn(
              "flex size-9 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-hover",
              active === key && !collapsed && "bg-brand-soft text-brand",
            )}
          >
            <Icon className="size-[18px]" aria-hidden="true" />
          </button>
        ))}
        <button type="button" aria-label="Send feedback" onClick={() => notify.comingSoon("Feedback")} className="mt-auto flex size-9 items-center justify-center rounded-md text-text-secondary hover:bg-surface-hover">
          <Smile className="size-[18px]" aria-hidden="true" />
        </button>
      </nav>

      {!collapsed && (
        <section aria-label={current.label} className="flex w-[280px] flex-col xl:w-[300px]">
          <div className="flex h-12 items-center justify-between border-b border-border pr-2 pl-4">
            <h2 className="font-sans text-sm font-medium text-text-primary">{current.label}</h2>
            <button type="button" aria-label="Collapse panel" onClick={() => setCollapsed(true)} className="flex size-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface-hover">
              <ChevronsLeft className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {active === "search" && <SmartSearchPanel meetingId={meetingId} />}
            {active === "outline" && <OutlinePanel chapters={chapters} />}
            {(active === "soundbites" || active === "comments" || active === "bookmarks") && (
              <EmptyState icon={PLACEHOLDERS[active].icon} title={PLACEHOLDERS[active].title} description={PLACEHOLDERS[active].text} className="py-12" />
            )}
          </div>
        </section>
      )}
    </div>
  );
}

"use client";

import { Copy, Plus, Sparkles, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { MeetingDetail } from "@/lib/api/types";
import { summaryAsText } from "@/lib/summaryText";
import { notify } from "@/lib/toast";

import { SummaryPlaceholder } from "./SummaryPlaceholder";
import { useSeekTo } from "./TranscriptSync";

const TEMPLATES = ["Sales Call", "Standup", "Candidate Feedback"];

/** General Summary toolbar, clickable bullets and keyword chips. */
export function SummaryPanel({ meeting }: { meeting: MeetingDetail }) {
  const seekTo = useSeekTo();
  const summary = meeting.summary;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summaryAsText(meeting));
      notify.success("Summary copied");
    } catch {
      notify.error("Couldn't copy the summary");
    }
  };

  return (
    <section aria-labelledby="summary-heading">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger id="summary-heading" className="flex items-center gap-2 rounded px-1 text-sm font-medium text-brand-soft-foreground">
            <Sparkles className="size-4" aria-hidden="true" /> General Summary <ChevronDown className="size-3.5" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuCheckboxItem checked>General Summary</DropdownMenuCheckboxItem>
            {TEMPLATES.map((name) => (
              <DropdownMenuCheckboxItem key={name} disabled checked={false}>
                {name} <span className="ml-auto text-[11px] text-text-tertiary">Coming soon</span>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon-sm" aria-label="Copy summary" onClick={() => void copy()} className="text-text-secondary">
          <Copy aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="sm" className="ml-auto text-text-secondary" onClick={() => notify.comingSoon("AI Apps")}>
          <Plus aria-hidden="true" /> AI Apps
        </Button>
      </div>

      {!summary ? (
        <SummaryPlaceholder meeting={meeting} />
      ) : (
        <>
          <ul className="mt-5 space-y-1.5 pl-1">
            {summary.bullets.map((bullet, index) => (
              <li key={`${index}-${bullet.start_ms}`} className="flex gap-3 text-[15px] leading-relaxed text-text-secondary">
                <span aria-hidden="true" className="mt-[11px] size-1.5 shrink-0 rounded-full bg-text-primary" />
                <button
                  type="button"
                  onClick={() => seekTo(bullet.start_ms)}
                  className="-mx-1.5 cursor-pointer rounded px-1.5 text-left hover:bg-surface-hover"
                >
                  <strong className="font-semibold text-text-primary">{bullet.label}:</strong> {bullet.text}
                </button>
              </li>
            ))}
          </ul>
          {summary.keywords.length > 0 && (
            <ul aria-label="Keywords" className="mt-5 flex flex-wrap gap-2">
              {summary.keywords.map((keyword) => (
                <li key={keyword} className="rounded-full bg-surface-subtle px-3 py-1 text-xs text-text-secondary">
                  {keyword}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

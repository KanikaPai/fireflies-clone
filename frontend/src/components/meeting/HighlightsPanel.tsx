"use client";

import { Bookmark, MessageSquare, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PersonAvatar } from "@/components/common/PersonAvatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteHighlight, useHighlights } from "@/hooks/useHighlights";
import type { HighlightKind } from "@/lib/api/types";
import { formatClock } from "@/lib/player/timeFormat";

import { useSeekTo } from "./TranscriptSync";

const COPY = {
  comment: { icon: MessageSquare, title: "No comments yet", text: "Select text in the transcript and choose Comment. Comments show up here in timestamp order." },
  highlight: { icon: Bookmark, title: "No bookmarks yet", text: "Select text in the transcript and choose Highlight. Your highlights are listed here." },
} as const;

/**
 * Comments or Bookmarks (highlights) in the left rail, in timestamp order. Clicking an entry jumps the player
 * to that moment and starts playback.
 */
export function HighlightsPanel({ meetingId, kind }: { meetingId: number; kind: HighlightKind }) {
  const { data, isPending, error, refetch } = useHighlights(meetingId);
  const remove = useDeleteHighlight(meetingId);
  const seekTo = useSeekTo();

  if (error) return <ErrorState title="Couldn't load this list" message={error.message} onRetry={() => void refetch()} />;
  if (isPending) {
    return (
      <div aria-busy="true" className="space-y-3 p-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  const items = data.filter((h) => h.kind === kind);
  if (items.length === 0) return <EmptyState icon={COPY[kind].icon} title={COPY[kind].title} description={COPY[kind].text} className="py-12" />;

  return (
    <ul aria-label={kind === "comment" ? "Comments" : "Bookmarks"} className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id} className="group relative">
          <button
            type="button"
            onClick={() => seekTo(item.segment_start_ms)}
            className="block w-full space-y-1.5 px-4 py-3 text-left hover:bg-surface-hover"
          >
            <span className="flex items-center gap-2 text-xs text-text-tertiary">
              <span className="font-medium text-brand tabular-nums">{formatClock(item.segment_start_ms)}</span>
              {kind === "comment" && (
                <>
                  <PersonAvatar name={item.author.name} color="var(--brand)" size="xs" />
                  <span className="truncate">{item.author.name}</span>
                </>
              )}
            </span>
            {item.quote && (
              <span className="line-clamp-3 block border-l-2 border-highlight-strong pl-2 text-[13px] text-text-secondary italic">“{item.quote}”</span>
            )}
            {kind === "comment" && <span className="block text-sm whitespace-pre-wrap text-text-primary">{item.note}</span>}
          </button>
          <button
            type="button"
            aria-label={kind === "comment" ? "Delete comment" : "Remove highlight"}
            onClick={() => remove.mutate(item)}
            className="absolute top-2 right-2 rounded p-1 text-text-tertiary opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-surface-sunken hover:text-danger"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

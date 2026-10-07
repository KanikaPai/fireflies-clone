"use client";

import { ArrowDownWideNarrow, ArrowUpNarrowWide, Bot, FileAudio, SearchX, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { useNewMeeting } from "@/components/new-meeting/NewMeetingProvider";
import { ComingSoon } from "@/components/common/ComingSoon";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { pluralize } from "@/components/common/formatters";
import { Button } from "@/components/ui/button";
import { useMeetingFilters } from "@/hooks/useMeetingFilters";
import { useMeetings } from "@/hooks/useMeetings";
import { cn } from "@/lib/utils";
import { DEFAULT_NOTEBOOK_VIEW, NOTEBOOK_VIEWS } from "@/components/layout/nav";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { NotebookView } from "@/lib/meetingFilters";

import { DeleteMeetingsModal, type DeletableMeeting } from "@/components/meeting-actions/DeleteMeetingsModal";
import { RenameMeetingModal } from "@/components/meeting-actions/RenameMeetingModal";
import type { MeetingListItem } from "@/lib/api/types";

import { BulkActionBar } from "./BulkActionBar";
import { DateRangeFilter } from "./DateRangeFilter";
import { DurationFilter } from "./DurationFilter";
import { MeetingListSkeleton } from "./MeetingListSkeleton";
import { MeetingTable } from "./MeetingTable";
import { ParticipantFilter } from "./ParticipantFilter";

/** The Notebook library at /meetings. All view/filter/sort/search state lives in the URL. */
export function MeetingsLibrary() {
  const { filters, apiParams, update, clear, activeCount } = useMeetingFilters();

  if (filters.view === "shared") {
    return (
      <>
        <ViewSwitcher className="m-3" />
        <EmptyState
          className="py-28"
          icon={Users}
          title="Nothing shared with you yet"
          description="Meetings that teammates share with you will show up here."
        />
      </>
    );
  }
  if (filters.view === "voice-agent") {
    return (
      <>
        <ViewSwitcher className="m-3" />
        <ComingSoon title="Voice Agent Meetings" icon={Bot} description="Calls run by your Fireflies voice agent will appear here." />
      </>
    );
  }

  return (
    <div className="pb-24">
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-4 py-2.5">
        <ViewSwitcher className="mr-1" />
        <ParticipantFilter value={filters.participantId} onChange={(id) => update({ participant: id ? String(id) : null })} />
        <DateRangeFilter
          range={filters.range}
          from={filters.from}
          to={filters.to}
          onChange={({ range, from, to }) => update({ range, from, to })}
        />
        <DurationFilter value={filters.duration} onChange={(duration) => update({ duration })} />

        <div className="ml-auto flex items-center gap-3">
          {activeCount > 0 && (
            <button type="button" onClick={clear} className="text-sm font-medium text-brand hover:underline">
              Clear filters
            </button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-text-secondary"
            onClick={() => update({ sort: filters.sort === "newest" ? "oldest" : null })}
            aria-label={`Sort order: ${filters.sort === "newest" ? "newest first" : "oldest first"}. Click to change.`}
          >
            {filters.sort === "newest" ? <ArrowDownWideNarrow aria-hidden="true" /> : <ArrowUpNarrowWide aria-hidden="true" />}
            {filters.sort === "newest" ? "Newest" : "Oldest"}
          </Button>
        </div>
      </div>

      <LibraryResults params={apiParams} activeCount={activeCount} onClear={clear} />
    </div>
  );
}

/** The notebook panel is hidden below lg, so the view switcher lives in the page there. */
function ViewSwitcher({ className }: { className?: string }) {
  const { filters, update } = useMeetingFilters();
  return (
    <Select value={filters.view} onValueChange={(view) => update({ view: view === DEFAULT_NOTEBOOK_VIEW ? null : view })}>
      <SelectTrigger
        aria-label="Meeting view"
        className={cn("h-9 w-48 border-transparent bg-brand-soft text-sm font-medium text-brand-soft-foreground shadow-none lg:hidden", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {NOTEBOOK_VIEWS.map(({ view, label }) => (
          <SelectItem key={view} value={view satisfies NotebookView}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface LibraryResultsProps {
  params: Parameters<typeof useMeetings>[0];
  activeCount: number;
  onClear: () => void;
}

function LibraryResults({ params, activeCount, onClear }: LibraryResultsProps) {
  const { open: openNewMeeting } = useNewMeeting();
  const { data, isPending, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage, isPlaceholderData } = useMeetings(params);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [renaming, setRenaming] = useState<MeetingListItem | null>(null);
  const [deleting, setDeleting] = useState<DeletableMeeting[]>([]);

  const meetings = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
  const total = data?.pages[0]?.total ?? 0;
  const toDeletable = (m: MeetingListItem): DeletableMeeting => ({ id: m.id, title: m.title, actionItemCount: m.action_item_count });

  if (isPending) return <MeetingListSkeleton />;
  if (error) return <ErrorState title="Couldn't load meetings" message={error.message} onRetry={() => void refetch()} />;

  if (meetings.length === 0) {
    return activeCount > 0 ? (
      <EmptyState
        icon={SearchX}
        title="No meetings match your filters"
        description="Try a different search or clear the filters to see all your meetings."
        action={<Button onClick={onClear}>Clear filters</Button>}
      />
    ) : (
      <EmptyState
        icon={FileAudio}
        title="Transcribe your first meeting"
        description="Upload a transcript or paste one in to see summaries and action items."
        action={<Button onClick={() => openNewMeeting()}>New meeting</Button>}
      />
    );
  }

  return (
    <div className={isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}>
      {activeCount > 0 && (
        <p className="px-6 pt-4 text-sm text-text-secondary" aria-live="polite">
          {pluralize(total, "meeting")} found
        </p>
      )}
      <MeetingTable
        meetings={meetings}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onRename={setRenaming}
        onDelete={(meeting) => setDeleting([toDeletable(meeting)])}
      />
      {hasNextPage && (
        <div className="flex flex-col items-center gap-2 py-8">
          <p className="text-xs text-text-tertiary">
            Showing {meetings.length} of {total}
          </p>
          <Button variant="soft" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
      <BulkActionBar
        count={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onDelete={() => setDeleting(meetings.filter((m) => selectedIds.has(m.id)).map(toDeletable))}
      />
      <RenameMeetingModal meeting={renaming} onOpenChange={(open) => !open && setRenaming(null)} />
      <DeleteMeetingsModal
        meetings={deleting}
        onOpenChange={(open) => !open && setDeleting([])}
        onDeleted={(ids) => {
          setSelectedIds((current) => new Set([...current].filter((id) => !ids.includes(id))));
          setDeleting([]);
        }}
      />
    </div>
  );
}

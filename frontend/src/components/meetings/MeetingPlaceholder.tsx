"use client";

import { useParams } from "next/navigation";

import { ErrorState } from "@/components/common/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { useMeeting } from "@/hooks/useMeeting";

/** Temporary detail page: just the title (the full meeting view is built in Phase 4). */
export function MeetingPlaceholder() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data, isPending, error, refetch } = useMeeting(id);

  if (isPending) return <Skeleton className="m-8 h-9 w-80" />;
  if (error) return <ErrorState title="Meeting not found" message={error.message} onRetry={() => void refetch()} />;
  return (
    <div className="px-8 py-8">
      <h2 className="text-2xl font-semibold text-text-primary">{data.title}</h2>
    </div>
  );
}

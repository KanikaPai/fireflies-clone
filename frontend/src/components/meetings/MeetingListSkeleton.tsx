import { Skeleton } from "@/components/ui/skeleton";

export function MeetingListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading meetings">
      <div className="px-6 pt-8 pb-4">
        <Skeleton className="h-5 w-56" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-t border-border px-6 py-4">
          <Skeleton className="size-[18px] rounded-[4px]" />
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="hidden h-4 w-36 md:block" />
          <Skeleton className="hidden h-4 w-24 lg:block" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

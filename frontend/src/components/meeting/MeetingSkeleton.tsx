import { Skeleton } from "@/components/ui/skeleton";

/** Loading state: skeleton bars where the title, summary and transcript will appear (as in Fireflies). */
export function MeetingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading meeting" className="grid h-full lg:grid-cols-[3rem_minmax(0,1fr)_minmax(380px,36%)]">
      <div className="hidden flex-col items-center gap-3 border-r border-border py-4 lg:flex">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="size-5 rounded" />
        ))}
      </div>
      <div className="mx-auto w-full max-w-[760px] px-8 py-10">
        <Skeleton className="h-10 w-full max-w-xl" />
        <div className="mt-4 flex gap-3">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="mt-12 flex items-center justify-between">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="mt-6 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
      <div className="hidden border-l border-border lg:block">
        <div className="flex h-12 items-center gap-6 border-b border-border px-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-6 p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-28" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}

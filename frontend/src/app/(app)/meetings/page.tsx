import type { Metadata } from "next";
import { Suspense } from "react";

import { MeetingListSkeleton } from "@/components/meetings/MeetingListSkeleton";
import { MeetingsLibrary } from "@/components/meetings/MeetingsLibrary";

export const metadata: Metadata = { title: "Meetings" };

export default function MeetingsPage() {
  return (
    <Suspense fallback={<MeetingListSkeleton />}>
      <MeetingsLibrary />
    </Suspense>
  );
}

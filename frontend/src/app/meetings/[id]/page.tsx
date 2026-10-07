import { Suspense } from "react";

import { MeetingPlaceholder } from "@/components/meetings/MeetingPlaceholder";

export default function MeetingPage() {
  return (
    <Suspense>
      <MeetingPlaceholder />
    </Suspense>
  );
}

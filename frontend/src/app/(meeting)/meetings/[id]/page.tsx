import type { Metadata } from "next";
import { Suspense } from "react";

import { MeetingPage } from "@/components/meeting/MeetingPage";

export const metadata: Metadata = { title: "Meeting" };

export default function Page() {
  return (
    <Suspense>
      <MeetingPage />
    </Suspense>
  );
}

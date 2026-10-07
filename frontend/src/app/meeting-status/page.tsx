import type { Metadata } from "next";

import { MeetingStatusPage } from "@/components/pages/MeetingStatusPage";

export const metadata: Metadata = { title: "Meeting Status" };

export default function Page() {
  return <MeetingStatusPage />;
}

import type { Metadata } from "next";
import { Suspense } from "react";

import { PrintMeeting } from "@/components/meeting/PrintMeeting";

export const metadata: Metadata = { title: "Print meeting" };

export default function Page() {
  return (
    <Suspense>
      <PrintMeeting />
    </Suspense>
  );
}

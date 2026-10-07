import type { Metadata } from "next";
import { Suspense } from "react";

import { SettingsPage } from "@/components/settings/SettingsPage";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  // SettingsPage reads ?tab= (useSearchParams), which must sit inside Suspense for the route to prerender.
  return (
    <Suspense fallback={null}>
      <SettingsPage />
    </Suspense>
  );
}

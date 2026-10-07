import type { Metadata } from "next";
import { Suspense } from "react";

import { SearchPage } from "@/components/search/SearchPage";

export const metadata: Metadata = { title: "Search" };

export default function Page() {
  // SearchPage reads ?q= (useSearchParams), which must sit inside Suspense for the route to prerender.
  return (
    <Suspense>
      <SearchPage />
    </Suspense>
  );
}

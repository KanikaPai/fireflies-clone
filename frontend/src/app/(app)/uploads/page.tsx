import type { Metadata } from "next";

import { UploadsPage } from "@/components/pages/UploadsPage";

export const metadata: Metadata = { title: "Uploads" };

export default function Page() {
  return <UploadsPage />;
}

import type { Metadata } from "next";
import { ChartNoAxesColumn } from "lucide-react";

import { ComingSoon } from "@/components/common/ComingSoon";

export const metadata: Metadata = { title: "Analytics" };

export default function Page() {
  return <ComingSoon title="Analytics" description="See meeting and conversation insights for your team." icon={ChartNoAxesColumn} />;
}

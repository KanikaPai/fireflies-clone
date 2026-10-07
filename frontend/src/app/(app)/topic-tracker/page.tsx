import type { Metadata } from "next";
import { Hash } from "lucide-react";

import { ComingSoon } from "@/components/common/ComingSoon";

export const metadata: Metadata = { title: "Topic Tracker" };

export default function Page() {
  return <ComingSoon title="Topic Tracker" description="Track the topics and keywords that matter across meetings." icon={Hash} />;
}

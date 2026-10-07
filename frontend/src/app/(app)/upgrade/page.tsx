import type { Metadata } from "next";
import { Star } from "lucide-react";

import { ComingSoon } from "@/components/common/ComingSoon";

export const metadata: Metadata = { title: "Upgrade" };

export default function Page() {
  return <ComingSoon title="Upgrade" description="Compare plans and unlock more of Fireflies." icon={Star} />;
}

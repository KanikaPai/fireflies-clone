import type { Metadata } from "next";
import { Sparkle } from "lucide-react";

import { ComingSoon } from "@/components/common/ComingSoon";

export const metadata: Metadata = { title: "AI Apps" };

export default function Page() {
  return <ComingSoon title="AI Apps" description="Generate custom summaries and insights with AI apps." icon={Sparkle} />;
}

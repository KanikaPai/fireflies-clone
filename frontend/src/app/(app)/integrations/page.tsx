import type { Metadata } from "next";
import { Layers } from "lucide-react";

import { ComingSoon } from "@/components/common/ComingSoon";

export const metadata: Metadata = { title: "Integrations" };

export default function Page() {
  return <ComingSoon title="Integrations" description="Connect Fireflies with the tools your team already uses." icon={Layers} />;
}

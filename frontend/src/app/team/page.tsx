import type { Metadata } from "next";
import { Users } from "lucide-react";

import { ComingSoon } from "@/components/common/ComingSoon";

export const metadata: Metadata = { title: "Team" };

export default function Page() {
  return <ComingSoon title="Team" description="Invite teammates and manage who has access." icon={Users} />;
}

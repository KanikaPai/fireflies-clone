import type { Metadata } from "next";
import { Settings } from "lucide-react";

import { ComingSoon } from "@/components/common/ComingSoon";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return <ComingSoon title="Settings" description="Account and notetaker preferences will live here." icon={Settings} />;
}

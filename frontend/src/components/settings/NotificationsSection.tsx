"use client";

import { Bell } from "lucide-react";

import { Switch } from "@/components/ui/switch";

import { SectionShell, useSection } from "./SectionShell";
import { SettingsCard } from "./SettingsCard";

export function NotificationsSection() {
  const { settings, change, query } = useSection();
  return (
    <SectionShell loading={!settings} error={query.error} onRetry={() => void query.refetch()}>
      {settings && (
        <SettingsCard icon={Bell} title="Notify me when a meeting is ready" description="Show a notification when processing finishes." id="notify-ready" inline>
          <Switch aria-labelledby="notify-ready" checked={settings.notify_on_ready} onCheckedChange={(notify_on_ready) => change({ notify_on_ready })} />
        </SettingsCard>
      )}
    </SectionShell>
  );
}

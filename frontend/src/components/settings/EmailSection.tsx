"use client";

import { Mail } from "lucide-react";

import { Switch } from "@/components/ui/switch";

import { SectionShell, useSection } from "./SectionShell";
import { SettingsCard } from "./SettingsCard";

export function EmailSection() {
  const { settings, change, query } = useSection();
  return (
    <SectionShell loading={!settings} error={query.error} onRetry={() => void query.refetch()}>
      {settings && (
        <SettingsCard icon={Mail} title="Email notes" description="Email me the summary and action items when a meeting is processed." id="email-notes" inline>
          <Switch aria-labelledby="email-notes" checked={settings.email_notes_enabled} onCheckedChange={(email_notes_enabled) => change({ email_notes_enabled })} />
        </SettingsCard>
      )}
    </SectionShell>
  );
}

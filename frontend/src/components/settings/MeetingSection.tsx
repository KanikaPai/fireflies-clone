"use client";

import { Globe, Mail, Video } from "lucide-react";

import type { AutoJoin, RecapRecipients } from "@/lib/api/types";
import { AUTO_JOIN_LABELS, LANGUAGES, RECAP_LABELS } from "@/lib/settings";

import { OptionSelect } from "./OptionSelect";
import { SectionShell, useSection } from "./SectionShell";
import { SettingsCard } from "./SettingsCard";

export function MeetingSection() {
  const { settings, change, query } = useSection();
  return (
    <SectionShell loading={!settings} error={query.error} onRetry={() => void query.refetch()}>
      {settings && (
        <>
          <SettingsCard icon={Video} title="Auto-join meetings" description="Meetings the Fireflies notetaker will join automatically." id="auto-join">
            <OptionSelect
              label="Auto-join meetings"
              value={settings.auto_join}
              options={(Object.keys(AUTO_JOIN_LABELS) as AutoJoin[]).map((value) => ({ value, label: AUTO_JOIN_LABELS[value] }))}
              onChange={(auto_join) => change({ auto_join })}
            />
          </SettingsCard>
          <SettingsCard icon={Mail} title="Send recap to" description="Who receives the meeting recap after it is processed." id="recap">
            <OptionSelect
              label="Send recap to"
              value={settings.recap_recipients}
              options={(Object.keys(RECAP_LABELS) as RecapRecipients[]).map((value) => ({ value, label: RECAP_LABELS[value] }))}
              onChange={(recap_recipients) => change({ recap_recipients })}
            />
          </SettingsCard>
          <SettingsCard icon={Globe} title="Meeting language" description="The language Fireflies expects in your meetings." id="language">
            <OptionSelect
              label="Meeting language"
              value={settings.language}
              options={LANGUAGES.map((language) => ({ value: language, label: language }))}
              onChange={(language) => change({ language })}
            />
          </SettingsCard>
        </>
      )}
    </SectionShell>
  );
}

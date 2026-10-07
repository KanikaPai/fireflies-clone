"use client";

import { Lock } from "lucide-react";

import type { Privacy } from "@/lib/api/types";
import { PRIVACY_OPTIONS, SETTINGS_PRIVACY_LEVELS } from "@/lib/privacy";

import { OptionSelect } from "./OptionSelect";
import { SectionShell, useSection } from "./SectionShell";
import { SettingsCard } from "./SettingsCard";

export function PrivacySection() {
  const { settings, change, query } = useSection();
  return (
    <SectionShell loading={!settings} error={query.error} onRetry={() => void query.refetch()}>
      {settings && (
        <>
          <h2 className="text-base text-text-secondary">Meeting Privacy &amp; Access</h2>
          <SettingsCard icon={Lock} title="Meeting privacy" description="Selected users will have access to meeting recordings. Applies to new meetings." id="privacy">
            <OptionSelect
              label="Meeting privacy"
              value={settings.default_privacy}
              options={SETTINGS_PRIVACY_LEVELS.map((value: Privacy) => ({ value, label: PRIVACY_OPTIONS[value].settingsLabel }))}
              onChange={(default_privacy) => change({ default_privacy })}
            />
          </SettingsCard>
          <p className="text-xs text-text-tertiary">Privacy is recorded for each meeting but not enforced in this demo (there is a single mocked user).</p>
        </>
      )}
    </SectionShell>
  );
}

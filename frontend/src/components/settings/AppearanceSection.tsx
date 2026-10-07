"use client";

import { Palette } from "lucide-react";

import { useTheme } from "@/hooks/useTheme";
import type { Theme } from "@/lib/api/types";
import { THEME_LABELS } from "@/lib/theme";

import { OptionSelect } from "./OptionSelect";
import { SectionShell, useSection } from "./SectionShell";
import { SettingsCard } from "./SettingsCard";

export function AppearanceSection() {
  const { settings, query } = useSection();
  const { setTheme } = useTheme();
  return (
    <SectionShell loading={!settings} error={query.error} onRetry={() => void query.refetch()}>
      {settings && (
        <SettingsCard icon={Palette} title="Theme" description="Choose light, dark, or follow your device." id="theme">
          <OptionSelect
            label="Theme"
            value={settings.theme}
            options={(Object.keys(THEME_LABELS) as Theme[]).map((value) => ({ value, label: THEME_LABELS[value] }))}
            onChange={setTheme}
          />
        </SettingsCard>
      )}
    </SectionShell>
  );
}

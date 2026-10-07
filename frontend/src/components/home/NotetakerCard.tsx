"use client";

import { Globe } from "lucide-react";
import { useState } from "react";

import { LogoMark } from "@/components/common/Logo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { notify } from "@/lib/toast";

const AUTO_JOIN = [
  "All meetings with web-conf link",
  "Only meetings that I own",
  "Only meetings with teammates",
  "Only when I invite fred@fireflies.ai",
];
const EMAIL_RECAP = ["Everyone on the invite", "Only me", "Only teammates"];

/** Notetaker settings card. State is UI-only for now (settings become real in Phase 6). */
export function NotetakerCard() {
  const [autoJoin, setAutoJoin] = useState(AUTO_JOIN[0]);
  const [recap, setRecap] = useState(EMAIL_RECAP[0]);

  return (
    <section aria-labelledby="notetaker-heading" className="rounded-xl bg-surface shadow-card">
      <h2 id="notetaker-heading" className="flex items-center gap-2 border-b border-border px-5 py-3.5 font-sans text-sm font-medium text-text-primary">
        <LogoMark className="size-4" />
        Fireflies Notetaker
      </h2>
      <div className="space-y-4 px-5 py-4">
        <SettingSelect label="Auto join calendar meetings" value={autoJoin} options={AUTO_JOIN} onChange={setAutoJoin} />
        <SettingSelect label="Send email recap to" value={recap} options={EMAIL_RECAP} onChange={setRecap} />
      </div>
      <div className="flex items-center gap-2.5 border-t border-border px-5 py-3.5 text-sm text-text-secondary">
        <Globe className="size-4 text-text-tertiary" aria-hidden="true" />
        Meeting language:
        <button type="button" className="text-brand underline-offset-2 hover:underline" onClick={() => notify.comingSoon("Language settings")}>
          English (Global)
        </button>
      </div>
    </section>
  );
}

interface SettingSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

function SettingSelect({ label, value, options, onChange }: SettingSelectProps) {
  return (
    <div className="space-y-1.5">
      <p id={`${label}-label`} className="text-sm font-medium text-text-primary">
        {label}
      </p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-labelledby={`${label}-label`} className="h-9 w-full border-transparent bg-surface-subtle text-sm text-text-secondary shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

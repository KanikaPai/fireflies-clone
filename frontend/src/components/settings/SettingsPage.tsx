"use client";

import { Bell, CreditCard, Globe, Layers, Lock, Mail, Plug, User, Video, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import { ComingSoon } from "@/components/common/ComingSoon";
import { ErrorState } from "@/components/common/ErrorState";
import { FormField } from "@/components/common/FormField";
import { SubmitButton } from "@/components/common/SubmitButton";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAutosaveSettings } from "@/hooks/useAutosaveSettings";
import { useHydrated } from "@/hooks/useHydrated";
import { useMe } from "@/hooks/useMe";
import { useUpdateProfile } from "@/hooks/useSettings";
import type { AutoJoin, Privacy, RecapRecipients } from "@/lib/api/types";
import { PRIVACY_OPTIONS, SETTINGS_PRIVACY_LEVELS } from "@/lib/privacy";
import { AUTO_JOIN_LABELS, LANGUAGES, RECAP_LABELS } from "@/lib/settings";
import { isValidEmail } from "@/lib/validation";
import { cn } from "@/lib/utils";

import { OptionSelect } from "./OptionSelect";
import { SettingsCard } from "./SettingsCard";

const TABS = [
  { key: "profile", label: "Profile", icon: User },
  { key: "meeting", label: "Meeting Settings", icon: Video },
  { key: "privacy", label: "Privacy & Access", icon: Lock },
  { key: "email", label: "Email Notes", icon: Mail },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "integrations", label: "Integrations", icon: Plug },
  { key: "billing", label: "Billing", icon: CreditCard },
] as const satisfies readonly { key: string; label: string; icon: LucideIcon }[];

type TabKey = (typeof TABS)[number]["key"];
const isTab = (value: string | null): value is TabKey => TABS.some((tab) => tab.key === value);

/** /settings: sub-navigation on the left, the selected section on the right. `?tab=` selects the section. */
export function SettingsPage() {
  const requested = useSearchParams().get("tab");
  const active: TabKey = isTab(requested) ? requested : "meeting";
  const current = TABS.find((tab) => tab.key === active)!;

  return (
    <div className="mx-auto flex max-w-[1000px] flex-col gap-6 px-4 py-6 md:flex-row md:px-6">
      <nav aria-label="Settings sections" className="md:w-56 md:shrink-0">
        <ul className="flex gap-1 overflow-x-auto md:flex-col">
          {TABS.map(({ key, label, icon: Icon }) => (
            <li key={key}>
              <Link
                href={`/settings?tab=${key}`}
                aria-current={key === active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium whitespace-nowrap",
                  key === active ? "bg-brand-soft text-brand-soft-foreground" : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 flex-1">
        <h1 className="mb-5 font-sans text-xl font-medium text-text-primary">{current.label}</h1>
        {active === "profile" && <ProfileSection />}
        {active === "meeting" && <MeetingSection />}
        {active === "privacy" && <PrivacySection />}
        {active === "email" && <EmailSection />}
        {active === "notifications" && <NotificationsSection />}
        {active === "integrations" && <ComingSoon title="Integrations settings" icon={Layers} description="Connect and manage your tools from the Integrations page." />}
        {active === "billing" && <ComingSoon title="Billing" icon={CreditCard} description="Plans and invoices will live here." />}
      </div>
    </div>
  );
}

/** Settings with a hydration-safe `settings` (undefined until the client has hydrated, so the skeleton matches the server HTML). */
function useSection() {
  const hydrated = useHydrated();
  const autosave = useAutosaveSettings();
  return { ...autosave, settings: hydrated ? autosave.settings : undefined };
}

function SectionShell({ children, loading, error, onRetry }: { children: ReactNode; loading: boolean; error: Error | null; onRetry: () => void }) {
  if (error) return <ErrorState title="Couldn't load your settings" message={error.message} onRetry={onRetry} />;
  if (loading) {
    return (
      <div aria-busy="true" className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }
  return <div className="space-y-4">{children}</div>;
}

function MeetingSection() {
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

function PrivacySection() {
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

function EmailSection() {
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

function NotificationsSection() {
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

function ProfileSection() {
  const hydrated = useHydrated();
  const { data: me, isPending, error, refetch } = useMe();
  return (
    <SectionShell loading={isPending || !hydrated} error={error} onRetry={() => void refetch()}>
      {me && <ProfileForm key={`${me.name}|${me.email}`} name={me.name} email={me.email} />}
    </SectionShell>
  );
}

function ProfileForm({ name: initialName, email: initialEmail }: { name: string; email: string }) {
  const update = useUpdateProfile();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const dirty = name.trim() !== initialName || email.trim() !== initialEmail;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = {
      name: name.trim() ? undefined : "Name can't be empty.",
      email: isValidEmail(email) ? undefined : "Enter a valid email address.",
    };
    setErrors(next);
    if (next.name || next.email) return;
    update.mutate({ name: name.trim(), email: email.trim() });
  };

  return (
    <form onSubmit={submit} noValidate className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <div className="max-w-md space-y-4">
        <FormField label="Name" htmlFor="profile-name" error={errors.name}>
          <Input id="profile-name" value={name} onChange={(event) => {
              setName(event.target.value);
              setErrors({});
            }} aria-invalid={errors.name ? true : undefined} maxLength={120} />
        </FormField>
        <FormField label="Email" htmlFor="profile-email" error={errors.email}>
          <Input id="profile-email" type="email" value={email} onChange={(event) => {
              setEmail(event.target.value);
              setErrors({});
            }} aria-invalid={errors.email ? true : undefined} maxLength={255} />
        </FormField>
        <SubmitButton type="submit" pending={update.isPending} disabled={!dirty}>
          Save changes
        </SubmitButton>
      </div>
    </form>
  );
}

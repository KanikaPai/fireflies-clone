"use client";

import { Bell, CreditCard, Layers, Lock, Mail, Palette, Plug, User, Video, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { ComingSoon } from "@/components/common/ComingSoon";
import { cn } from "@/lib/utils";

import { AppearanceSection } from "./AppearanceSection";
import { EmailSection } from "./EmailSection";
import { MeetingSection } from "./MeetingSection";
import { NotificationsSection } from "./NotificationsSection";
import { PrivacySection } from "./PrivacySection";
import { ProfileSection } from "./ProfileSection";

const TABS = [
  { key: "profile", label: "Profile", icon: User },
  { key: "meeting", label: "Meeting Settings", icon: Video },
  { key: "privacy", label: "Privacy & Access", icon: Lock },
  { key: "appearance", label: "Appearance", icon: Palette },
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
        {active === "appearance" && <AppearanceSection />}
        {active === "email" && <EmailSection />}
        {active === "notifications" && <NotificationsSection />}
        {active === "integrations" && <ComingSoon title="Integrations settings" icon={Layers} description="Connect and manage your tools from the Integrations page." />}
        {active === "billing" && <ComingSoon title="Billing" icon={CreditCard} description="Plans and invoices will live here." />}
      </div>
    </div>
  );
}

import { Building2, Contact, Globe, Lock, Users, UsersRound, type LucideIcon } from "lucide-react";

import type { Privacy } from "@/lib/api/types";

interface PrivacyOption {
  /** Label in the Share modal. */
  shareLabel: string;
  /** Label on the Settings page (Fireflies words the same levels differently there). */
  settingsLabel: string;
  description: string;
  icon: LucideIcon;
  /** The Share modal offers five of the six levels; "participants_team" is a Settings-only level. */
  inShareModal: boolean;
}

/** Single source of truth for the six privacy levels, used by the Share modal and the Settings page. */
export const PRIVACY_OPTIONS: Record<Privacy, PrivacyOption> = {
  link: {
    shareLabel: "Teammates & Anyone with Link",
    settingsLabel: "Teammates & Anyone with Link",
    description: "Teammates and anyone with the link can access",
    icon: Globe,
    inShareModal: true,
  },
  teammates_participants: {
    shareLabel: "Teammates and Participants",
    settingsLabel: "Only Participants & Teammates",
    description: "Teammates and meeting participants can access",
    icon: UsersRound,
    inShareModal: true,
  },
  teammates: {
    shareLabel: "Teammates",
    settingsLabel: "Only Teammates",
    description: "Only teammates can access",
    icon: Building2,
    inShareModal: true,
  },
  participants: {
    shareLabel: "Participants",
    settingsLabel: "Only Participants",
    description: "Only meeting participants can access",
    icon: Contact,
    inShareModal: true,
  },
  participants_team: {
    shareLabel: "Participants in the Team",
    settingsLabel: "Only Participants in the Team",
    description: "Only participants who are on your team can access",
    icon: Users,
    inShareModal: false,
  },
  owner: {
    shareLabel: "Only Owner",
    settingsLabel: "Only Me",
    description: "Only you can access",
    icon: Lock,
    inShareModal: true,
  },
};

const ORDER: Privacy[] = ["link", "teammates_participants", "teammates", "participants", "participants_team", "owner"];

export const SHARE_PRIVACY_LEVELS: Privacy[] = ORDER.filter((level) => PRIVACY_OPTIONS[level].inShareModal);
export const SETTINGS_PRIVACY_LEVELS: Privacy[] = ORDER;

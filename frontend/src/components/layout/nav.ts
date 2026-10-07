import {
  Bot,
  ChartNoAxesColumn,
  Contact,
  Hash,
  House,
  Layers,
  ListVideo,
  Settings,
  Sparkle,
  Star,
  Upload,
  Users,
  Video,
  Zap,
  Building2,
  type LucideIcon,
} from "lucide-react";

import type { NotebookView } from "@/lib/meetingFilters";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

/** Sidebar groups, separated by dividers. */
export const NAV_GROUPS: NavItem[][] = [
  [
    { label: "Home", href: "/home", icon: House },
    { label: "Meetings", href: "/meetings", icon: Video },
    { label: "Meeting Status", href: "/meeting-status", icon: Zap },
    { label: "Playlist", href: "/playlist", icon: ListVideo },
    { label: "Contacts", href: "/contacts", icon: Contact },
    { label: "Uploads", href: "/uploads", icon: Upload },
  ],
  [
    { label: "Integrations", href: "/integrations", icon: Layers, badge: "NEW" },
    { label: "AI Apps", href: "/ai-apps", icon: Sparkle },
    { label: "Topic Tracker", href: "/topic-tracker", icon: Hash },
    { label: "Analytics", href: "/analytics", icon: ChartNoAxesColumn },
  ],
  [
    { label: "Team", href: "/team", icon: Users },
    { label: "Upgrade", href: "/upgrade", icon: Star },
    { label: "Settings", href: "/settings", icon: Settings },
  ],
];

export const isActiveRoute = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);

/** Topbar titles by route prefix. */
const PAGE_TITLES: [string, string][] = [
  ["/home", "Home"],
  ["/meetings", "Meetings"],
  ["/meeting-status", "Meeting Status"],
  ["/search", "Search"],
  ["/playlist", "Playlist"],
  ["/contacts", "Contacts"],
  ["/uploads", "Uploads"],
  ["/integrations", "Integrations"],
  ["/ai-apps", "AI Apps"],
  ["/topic-tracker", "Topic Tracker"],
  ["/analytics", "Analytics"],
  ["/team", "Team"],
  ["/upgrade", "Upgrade"],
  ["/settings", "Settings"],
];

export const pageTitle = (pathname: string): string =>
  PAGE_TITLES.find(([prefix]) => isActiveRoute(pathname, prefix))?.[1] ?? "";


export const NOTEBOOK_VIEWS: { view: NotebookView; label: string; icon: LucideIcon }[] = [
  { view: "my", label: "My Meetings", icon: Hash },
  { view: "all", label: "All Meetings", icon: Building2 },
  { view: "shared", label: "Shared With Me", icon: Users },
  { view: "voice-agent", label: "Voice Agent Meetings", icon: Bot },
];

export const DEFAULT_NOTEBOOK_VIEW: NotebookView = "my";

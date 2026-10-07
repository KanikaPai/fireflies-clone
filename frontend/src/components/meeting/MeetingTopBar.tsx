"use client";

import { ChevronDown, Menu, Plus } from "lucide-react";
import Link from "next/link";

import { NotificationsPopover } from "@/components/layout/NotificationsPopover";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/toast";

import { MeetingActionsMenu } from "./MeetingActionsMenu";
import { ShareButton } from "./ShareButton";

/** Stand-in for the Slack mark (lucide has no brand icons); built from status tokens. */
function SlackMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <rect x="3" y="9" width="8" height="3.5" rx="1.75" className="fill-info" />
      <rect x="9" y="3" width="3.5" height="8" rx="1.75" className="fill-success" />
      <rect x="13" y="11.5" width="8" height="3.5" rx="1.75" className="fill-warning" />
      <rect x="11.5" y="13" width="3.5" height="8" rx="1.75" className="fill-danger" />
    </svg>
  );
}

interface MeetingTopBarProps {
  title?: string;
  meetingId?: number;
  onOpenNav: () => void;
}

export function MeetingTopBar({ title, meetingId, onOpenNav }: MeetingTopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-3">
      <Button variant="ghost" size="icon" aria-label="Open navigation" onClick={onOpenNav} className="text-text-secondary">
        <Menu aria-hidden="true" />
      </Button>
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm text-text-secondary">
        <Link href="/meetings?view=all" className="hidden shrink-0 rounded px-1 hover:text-text-primary hover:underline sm:inline">
          #All Meetings
        </Link>
        <span aria-hidden="true" className="hidden sm:inline">/</span>
        {title && (
          <>
            <span className="truncate font-medium text-text-primary" aria-current="page">
              {title}
            </span>
            {meetingId !== undefined && <MeetingActionsMenu />}
          </>
        )}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Button variant="ghost" size="sm" aria-label="Slack" className="hidden sm:inline-flex" onClick={() => notify.comingSoon("Slack")}>
          <SlackMark />
          <ChevronDown className="text-text-tertiary" aria-hidden="true" />
        </Button>
        <ShareButton />
        <Button variant="ghost" size="icon" aria-label="Add" className="hidden border border-border text-text-secondary sm:inline-flex" onClick={() => notify.comingSoon("Add")}>
          <Plus aria-hidden="true" />
        </Button>
        <NotificationsPopover />
        <UserMenu />
      </div>
    </header>
  );
}

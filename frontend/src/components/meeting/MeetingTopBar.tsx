"use client";

import { ChevronDown, Globe, Menu, Plus } from "lucide-react";
import Link from "next/link";

import { SlackMark } from "@/components/common/BrandMarks";
import { NotificationsPopover } from "@/components/layout/NotificationsPopover";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/toast";

import { MeetingActionsMenu } from "./MeetingActionsMenu";
import { ShareButton } from "./ShareButton";

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
        {meetingId !== undefined ? (
          <ShareButton />
        ) : (
          <Button disabled>
            <Globe aria-hidden="true" /> Share
          </Button>
        )}
        <Button variant="ghost" size="icon" aria-label="Add" className="hidden border border-border text-text-secondary sm:inline-flex" onClick={() => notify.comingSoon("Add")}>
          <Plus aria-hidden="true" />
        </Button>
        <NotificationsPopover />
        <UserMenu />
      </div>
    </header>
  );
}

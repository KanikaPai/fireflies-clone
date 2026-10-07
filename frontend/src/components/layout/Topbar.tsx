"use client";

import { Menu, Mic, UserPlus } from "lucide-react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { notify } from "@/lib/toast";

import { CaptureButton } from "./CaptureButton";
import { pageTitle } from "./nav";
import { NotificationsPopover } from "./NotificationsPopover";
import { TopbarSearch } from "./TopbarSearch";
import { UserMenu } from "./UserMenu";

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
      <Button variant="ghost" size="icon" aria-label="Open navigation" className="md:hidden" onClick={onOpenMenu}>
        <Menu aria-hidden="true" />
      </Button>
      <h1 className="w-32 shrink-0 truncate font-sans text-[15px] font-medium text-text-secondary lg:w-40">{pageTitle(pathname)}</h1>

      <div className="flex flex-1 justify-center">
        <TopbarSearch />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button variant="soft" onClick={() => notify.comingSoon("Invite")} className="hidden sm:inline-flex">
          <UserPlus aria-hidden="true" />
          Invite
        </Button>
        <CaptureButton />
        <Button variant="ghost" size="icon" aria-label="Voice capture" className="text-brand" onClick={() => notify.comingSoon("Voice capture")}>
          <Mic aria-hidden="true" />
        </Button>
        <NotificationsPopover />
        <UserMenu />
      </div>
    </header>
  );
}

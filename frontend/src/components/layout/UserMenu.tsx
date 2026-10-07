"use client";

import { LogOut, Settings, User as UserIcon } from "lucide-react";
import Link from "next/link";

import { PersonAvatar } from "@/components/common/PersonAvatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/hooks/useMe";
import { notify } from "@/lib/toast";

export function UserMenu() {
  const { data: me } = useMe();
  if (!me) return <Skeleton className="size-8 rounded-full" />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Account menu" className="rounded-full">
        <PersonAvatar name={me.name} color="var(--brand)" size="md" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col py-2">
          <span className="text-sm font-medium text-text-primary">{me.name}</span>
          <span className="text-xs font-normal text-text-tertiary">{me.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => notify.comingSoon("Profile")}>
          <UserIcon aria-hidden="true" /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings aria-hidden="true" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => notify.comingSoon("Log out")}>
          <LogOut aria-hidden="true" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

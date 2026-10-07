"use client";

import { Suspense, useState, type ReactNode } from "react";

import { NavDrawer } from "./NavDrawer";
import { ShellNav } from "./ShellNav";
import { Topbar } from "./Topbar";

/** Page chrome: navigation columns, mobile drawer and topbar around the page content. */
export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Suspense fallback={<div className="hidden w-16 shrink-0 border-r border-border md:block lg:w-60" />}>
        <ShellNav />
      </Suspense>
      <NavDrawer open={drawerOpen} onOpenChange={setDrawerOpen} mobileOnly />

      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<div className="h-14 shrink-0 border-b border-border" />}>
          <Topbar onOpenMenu={() => setDrawerOpen(true)} />
        </Suspense>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

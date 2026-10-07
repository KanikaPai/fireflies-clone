"use client";

import { Suspense, useState, type ReactNode } from "react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

import { ShellNav } from "./ShellNav";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

/** Page chrome: navigation columns, mobile drawer and topbar around the page content. */
export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Suspense fallback={<div className="hidden w-16 shrink-0 border-r border-border md:block lg:w-60" />}>
        <ShellNav />
      </Suspense>

      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-0 left-0 h-dvh w-64 max-w-64 translate-x-0 translate-y-0 gap-0 rounded-none p-0 sm:max-w-64 md:hidden"
        >
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <DialogDescription className="sr-only">Main navigation</DialogDescription>
          <Suspense>
            <Sidebar forceExpanded onNavigate={() => setDrawerOpen(false)} />
          </Suspense>
        </DialogContent>
      </Dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<div className="h-14 shrink-0 border-b border-border" />}>
          <Topbar onOpenMenu={() => setDrawerOpen(true)} />
        </Suspense>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

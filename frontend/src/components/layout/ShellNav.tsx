"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { NotebookPanel } from "./NotebookPanel";
import { Sidebar } from "./Sidebar";

/**
 * Route-dependent navigation columns. On /meetings routes the sidebar becomes an icon rail and, on the
 * library page itself, the notebook (channels) panel sits beside it. Kept separate from AppShell so
 * only this part suspends on the pathname.
 */
export function ShellNav() {
  const pathname = usePathname();
  const inMeetings = pathname === "/meetings" || pathname.startsWith("/meetings/");
  return (
    <>
      <div className="hidden md:block">
        <Sidebar rail={inMeetings} />
      </div>
      {pathname === "/meetings" && (
        <Suspense fallback={<div className="hidden w-60 shrink-0 border-r border-border md:block" />}>
          <NotebookPanel />
        </Suspense>
      )}
    </>
  );
}

"use client";

import { useState, type ReactNode } from "react";

import { NavDrawer } from "@/components/layout/NavDrawer";

import { MeetingTopBar } from "./MeetingTopBar";

interface MeetingFrameProps {
  title?: string;
  meetingId?: number;
  children: ReactNode;
}

/** Top bar + main-nav drawer around the meeting body. Shared by the loaded, loading and error states. */
export function MeetingFrame({ title, meetingId, children }: MeetingFrameProps) {
  const [navOpen, setNavOpen] = useState(false);
  return (
    <div className="flex h-dvh flex-col">
      <MeetingTopBar title={title} meetingId={meetingId} onOpenNav={() => setNavOpen(true)} />
      <NavDrawer open={navOpen} onOpenChange={setNavOpen} />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

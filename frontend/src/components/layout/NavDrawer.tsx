"use client";

import { Suspense } from "react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { Sidebar } from "./Sidebar";

interface NavDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Only show below `md` (the app shell has a permanent sidebar from `md` up). */
  mobileOnly?: boolean;
}

/** The main navigation as a slide-in drawer. */
export function NavDrawer({ open, onOpenChange, mobileOnly = false }: NavDrawerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "top-0 left-0 h-dvh w-64 max-w-64 translate-x-0 translate-y-0 gap-0 rounded-none p-0 sm:max-w-64",
          mobileOnly && "md:hidden",
        )}
      >
        <DialogTitle className="sr-only">Navigation</DialogTitle>
        <DialogDescription className="sr-only">Main navigation</DialogDescription>
        <Suspense>
          <Sidebar forceExpanded onNavigate={() => onOpenChange(false)} />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}

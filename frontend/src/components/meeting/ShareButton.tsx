"use client";

import { Globe, Link2 } from "lucide-react";

import { useMeetingDialogs } from "@/components/meeting-actions/MeetingDialogs";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/toast";

/** Purple split button: Share (opens the share modal) + copy-link. */
export function ShareButton() {
  const { open } = useMeetingDialogs();
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify.success("Link copied");
    } catch {
      notify.error("Couldn't copy the link");
    }
  };
  return (
    <div className="flex items-stretch">
      <Button className="rounded-r-none" onClick={() => open("share")}>
        <Globe aria-hidden="true" /> Share
      </Button>
      <Button aria-label="Copy link" className="rounded-l-none border-l border-brand-foreground/25 px-2.5" onClick={() => void copyLink()}>
        <Link2 aria-hidden="true" />
      </Button>
    </div>
  );
}

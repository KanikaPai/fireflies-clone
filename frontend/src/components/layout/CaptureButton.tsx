"use client";

import { ChevronDown, ClipboardPaste, Radio, Upload, Video } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { notify } from "@/lib/toast";

/** Purple split button: main action plus a menu of capture options. */
export function CaptureButton() {
  const router = useRouter();
  return (
    <div className="flex items-stretch">
      <Button className="rounded-r-none pr-3" onClick={() => notify.comingSoon("Capture")}>
        <Video aria-hidden="true" />
        Capture
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-label="More capture options" className="rounded-l-none border-l border-brand-foreground/25 px-2">
            <ChevronDown aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={() => router.push("/uploads")}>
            <Upload aria-hidden="true" /> Upload transcript
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push("/uploads")}>
            <ClipboardPaste aria-hidden="true" /> Paste transcript
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => notify.comingSoon("Add to live meeting")}>
            <Radio aria-hidden="true" /> Add to live meeting
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

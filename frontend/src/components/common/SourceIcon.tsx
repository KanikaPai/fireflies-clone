import { Bot, Upload } from "lucide-react";

import type { Platform } from "@/lib/api/types";

const LABELS: Record<Platform, string> = {
  upload: "Uploaded file",
  zoom: "Zoom meeting",
  google_meet: "Google Meet meeting",
  teams: "Microsoft Teams meeting",
};

/** Small source marker: an upload arrow for uploaded files, a bot icon for recorded meetings. */
export function SourceIcon({ platform }: { platform: Platform }) {
  const Icon = platform === "upload" ? Upload : Bot;
  return <Icon className="size-3.5 text-text-tertiary" aria-label={LABELS[platform]} role="img" />;
}

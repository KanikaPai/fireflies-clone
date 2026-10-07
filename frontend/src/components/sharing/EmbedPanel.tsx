"use client";

import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { notify } from "@/lib/toast";

/** The Embed tab: a read-only <iframe> snippet pointing at the meeting page, with a Copy button. */
export function EmbedPanel({ url }: { url: string }) {
  const snippet = `<iframe src="${url}" width="100%" height="640" style="border:0" allowfullscreen></iframe>`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      notify.success("Embed code copied");
    } catch {
      notify.error("Couldn't copy the embed code");
    }
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-text-secondary">Paste this code into a page to embed the meeting.</p>
      <textarea
        readOnly
        value={snippet}
        aria-label="Embed code"
        rows={4}
        onFocus={(event) => event.currentTarget.select()}
        className="w-full resize-none rounded-lg border border-border bg-surface-subtle p-3 font-mono text-xs leading-relaxed text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      />
      <div className="flex justify-end">
        <Button onClick={() => void copy()}>
          <Copy aria-hidden="true" /> Copy
        </Button>
      </div>
    </div>
  );
}

"use client";

import { Bot, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Segment } from "@/lib/api/types";
import { notify } from "@/lib/toast";

import { AskFredPanel } from "./AskFredPanel";
import { TranscriptPanel } from "./TranscriptPanel";

const TAB = "h-12 flex-none rounded-none px-1 text-sm text-text-secondary data-active:text-brand-soft-foreground group-data-horizontal/tabs:after:bottom-0 after:bg-brand";

/** Right column: Transcript / AskFred tabs. */
export function TranscriptColumn({ meetingId, segments }: { meetingId: number; segments: Segment[] }) {
  return (
    <Tabs defaultValue="transcript" className="min-h-0 flex-1 gap-0">
      <div className="flex items-center border-b border-border px-4">
        <TabsList variant="line" className="h-12 gap-5 bg-transparent p-0">
          <TabsTrigger value="transcript" className={TAB}>
            Transcript
          </TabsTrigger>
          <TabsTrigger value="askfred" className={TAB}>
            <span className="flex size-5 items-center justify-center rounded bg-brand-soft text-brand">
              <Bot className="size-3.5" aria-hidden="true" />
            </span>
            AskFred
          </TabsTrigger>
        </TabsList>
        <Button variant="ghost" size="icon-sm" aria-label="Edit transcript" className="ml-auto text-text-secondary" onClick={() => notify.nextStep("Transcript editing")}>
          <Pencil aria-hidden="true" />
        </Button>
      </div>
      <TabsContent value="transcript" className="flex min-h-0 flex-1 flex-col pt-3">
        <TranscriptPanel meetingId={meetingId} segments={segments} />
      </TabsContent>
      <TabsContent value="askfred" className="flex min-h-0 flex-1 flex-col pt-3">
        <AskFredPanel />
      </TabsContent>
    </Tabs>
  );
}

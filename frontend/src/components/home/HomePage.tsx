"use client";

import { Sparkles, Video } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { notify } from "@/lib/toast";

import { FeedTab } from "./FeedTab";
import { NotetakerCard } from "./NotetakerCard";
import { TasksTab } from "./TasksTab";
import { UpcomingMeetingsCard } from "./UpcomingMeetingsCard";

const TAB_TRIGGER =
  "h-12 flex-none rounded-none px-1 text-sm text-text-secondary hover:text-text-primary data-active:text-text-primary group-data-horizontal/tabs:after:bottom-0 after:bg-text-primary";

export function HomePage() {
  return (
    <div className="min-h-full bg-gradient-to-b from-brand-soft/60 to-background px-4 py-5 md:px-6">
      <div className="mx-auto grid max-w-[1180px] gap-5 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
        <Tabs defaultValue="feed" className="gap-0 rounded-xl bg-surface shadow-card">
          <TabsList variant="line" className="h-12 p-0 w-full justify-start gap-6 rounded-none border-b border-border bg-transparent px-6">
            <TabsTrigger value="feed" className={TAB_TRIGGER}>
              My Feed
            </TabsTrigger>
            <TabsTrigger value="tasks" className={TAB_TRIGGER}>
              Tasks
            </TabsTrigger>
            <TabsTrigger value="apps" className={TAB_TRIGGER}>
              AI Apps
              <span className="ml-2 rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand-soft-foreground">NEW</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="feed" className="px-4 pb-8 xl:px-6">
            <FeedTab />
          </TabsContent>
          <TabsContent value="tasks" className="px-4 pt-4 pb-8 xl:px-6">
            <TasksTab />
          </TabsContent>
          <TabsContent value="apps" className="px-4 pb-8 xl:px-6">
            <EmptyState icon={Sparkles} title="AI Apps are coming soon" description="Generate custom summaries and insights tailored to your role." />
          </TabsContent>
        </Tabs>

        <aside className="space-y-4" aria-label="Notetaker and upcoming meetings">
          <Button className="h-10 w-full" onClick={() => notify.comingSoon("Add to live meeting")}>
            <Video aria-hidden="true" /> Add to live meeting
          </Button>
          <NotetakerCard />
          <UpcomingMeetingsCard />
        </aside>
      </div>
    </div>
  );
}

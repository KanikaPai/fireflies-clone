"use client";

import { FileQuestion } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import { Button } from "@/components/ui/button";
import { useMeeting, useTranscript } from "@/hooks/useMeeting";
import { ApiError } from "@/lib/api/client";
import { MeetingDialogsProvider } from "@/components/meeting-actions/MeetingDialogs";
import { parseTimeParam } from "@/lib/player/timeFormat";
import Link from "next/link";

import { MeetingFrame } from "./MeetingFrame";
import { MeetingLayout } from "./MeetingLayout";
import { MeetingSkeleton } from "./MeetingSkeleton";
import { TranscriptFilterProvider } from "./TranscriptFilter";
import { TranscriptSyncProvider } from "./TranscriptSync";

/** /meetings/[id]: loads the meeting and transcript, then mounts the player and the three-column view. */
export function MeetingPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = Number(params.id);
  // Set once this meeting was deleted from this page: stop querying it (it would 404) while we navigate away.
  const [deleted, setDeleted] = useState(false);
  const meeting = useMeeting(id, !deleted);
  const transcript = useTranscript(id, !deleted);

  if (deleted || meeting.isPending || transcript.isPending) {
    return (
      <MeetingFrame>
        <MeetingSkeleton />
      </MeetingFrame>
    );
  }

  const error = meeting.error ?? transcript.error;
  if (error || !meeting.data || !transcript.data) {
    const notFound = error instanceof ApiError && error.isNotFound;
    return (
      <MeetingFrame>
        {notFound ? (
          <EmptyState
            className="py-32"
            icon={FileQuestion}
            title="Meeting not found"
            description="This meeting doesn't exist or may have been deleted."
            action={
              <Button asChild>
                <Link href="/meetings">Back to meetings</Link>
              </Button>
            }
          />
        ) : (
          <ErrorState
            title="Couldn't load this meeting"
            message={error?.message}
            onRetry={() => {
              void meeting.refetch();
              void transcript.refetch();
            }}
          />
        )}
      </MeetingFrame>
    );
  }

  return (
    <PlayerProvider
      key={meeting.data.id}
      durationMs={meeting.data.duration_seconds * 1000}
      mediaUrl={meeting.data.media_url}
      initialTimeMs={parseTimeParam(searchParams.get("t"))}
    >
      <TranscriptSyncProvider>
        <TranscriptFilterProvider>
          <MeetingDialogsProvider
            meeting={meeting.data}
            onDeleted={() => {
              setDeleted(true);
              router.replace("/meetings");
            }}
          >
            <MeetingFrame title={meeting.data.title} meetingId={meeting.data.id}>
              <MeetingLayout meeting={meeting.data} segments={transcript.data.segments} />
            </MeetingFrame>
          </MeetingDialogsProvider>
        </TranscriptFilterProvider>
      </TranscriptSyncProvider>
    </PlayerProvider>
  );
}

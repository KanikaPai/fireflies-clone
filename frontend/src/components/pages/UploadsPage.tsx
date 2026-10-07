"use client";

import { Inbox, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type DragEvent } from "react";

import { useNewMeeting } from "@/components/new-meeting/NewMeetingProvider";
import { ErrorState } from "@/components/common/ErrorState";
import { formatDate, formatDuration, formatTime } from "@/components/common/formatters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMeetings } from "@/hooks/useMeetings";
import { cn } from "@/lib/utils";

const ACCEPTED = [".txt", ".vtt", ".json"];

export function UploadsPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { data, isPending, error, refetch } = useMeetings({ platform: "upload", page_size: 10 });
  const uploads = data?.pages.flatMap((p) => p.items) ?? [];

  const { open } = useNewMeeting();
  // A chosen or dropped file opens the New meeting modal pre-filled (it validates the file and shows a preview).
  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) open({ tab: "upload", file });
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  return (
    <div className="mx-auto max-w-[760px] px-6 py-8">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center rounded-lg border border-dashed px-6 py-12 text-center transition-colors",
          dragging ? "border-brand bg-brand-soft" : "border-brand/40 bg-surface",
        )}
      >
        <Upload className="mb-4 size-6 text-text-secondary" aria-hidden="true" />
        <h2 className="font-heading text-[15px] font-medium text-text-primary">Upload a file to generate a transcript</h2>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-text-tertiary">
          Browse or drag and drop <strong className="text-text-secondary">.TXT</strong>, <strong className="text-text-secondary">.VTT</strong> or{" "}
          <strong className="text-text-secondary">.JSON</strong> transcript files. (Max file size: 5&nbsp;MB)
        </p>
        <input ref={inputRef} type="file" accept={ACCEPTED.join(",")} className="sr-only" aria-label="Choose a transcript file" onChange={(e) => handleFiles(e.target.files)} />
        <Button className="mt-5" onClick={() => inputRef.current?.click()}>
          Browse Files
        </Button>
      </div>

      <section aria-labelledby="recent-uploads" className="mt-10">
        {isPending && <Skeleton className="mx-auto h-24 w-full" />}
        {error && <ErrorState title="Couldn't load uploads" message={error.message} onRetry={() => void refetch()} />}
        {!isPending && !error && uploads.length === 0 && (
          <div className="flex flex-col items-center py-6 text-center">
            <Inbox className="mb-3 size-9 text-text-disabled" aria-hidden="true" />
            <h2 id="recent-uploads" className="text-[17px] font-medium text-text-primary">You have no recent uploads!</h2>
          </div>
        )}
        {uploads.length > 0 && (
          <>
            <h2 id="recent-uploads" className="mb-3 font-sans text-base font-medium text-text-primary">Recent uploads</h2>
            <ul className="divide-y divide-border rounded-xl bg-surface shadow-card">
              {uploads.map((m) => (
                <li key={m.id}>
                  <Link href={`/meetings/${m.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-hover">
                    <Upload className="size-4 shrink-0 text-text-tertiary" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">{m.title}</span>
                    <span className="hidden text-[13px] text-text-tertiary sm:inline">
                      {formatDate(m.meeting_date)} · {formatTime(m.meeting_date)}
                    </span>
                    <span className="text-[13px] text-text-tertiary">{formatDuration(m.duration_seconds)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

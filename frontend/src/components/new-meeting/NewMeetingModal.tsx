"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { FormField } from "@/components/common/FormField";
import { Modal } from "@/components/common/Modal";
import { MultiSelect } from "@/components/common/MultiSelect";
import { PersonAvatar } from "@/components/common/PersonAvatar";
import { SubmitButton } from "@/components/common/SubmitButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateMeeting } from "@/hooks/useCreateMeeting";
import { useCreatePerson, useCreateTag } from "@/hooks/useMeetingMutations";
import { usePeople } from "@/hooks/usePeople";
import { useTags } from "@/hooks/useTags";
import { notify } from "@/lib/toast";
import { titleFromFileName } from "@/lib/transcriptSource";
import { localDateTimeToIso, validateTitle } from "@/lib/validation";

import { TranscriptInput, type ReadyTranscript } from "./TranscriptInput";

export type NewMeetingTab = "upload" | "paste" | "manual";

interface NewMeetingModalProps {
  open: boolean;
  tab: NewMeetingTab;
  /** A file chosen before the modal opened (dropped on /uploads). */
  initialFile: File | null;
  onOpenChange: (open: boolean) => void;
}

export function NewMeetingModal({ open, tab, initialFile, onOpenChange }: NewMeetingModalProps) {
  // Mounted only while open, so every opening starts from a clean form.
  return open ? <NewMeetingForm initialTab={tab} initialFile={initialFile} onOpenChange={onOpenChange} /> : null;
}

function NewMeetingForm({ initialTab, initialFile, onOpenChange }: { initialTab: NewMeetingTab; initialFile: File | null; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const create = useCreateMeeting();
  const people = usePeople();
  const tags = useTags();
  const createPerson = useCreatePerson();
  const createTag = useCreateTag();

  const [tab, setTab] = useState<NewMeetingTab>(initialTab);
  const [file, setFile] = useState<File | null>(initialFile);
  const [text, setText] = useState("");
  const [ready, setReady] = useState<ReadyTranscript | null>(null);

  const now = useMemo(() => new Date(), []);
  const [titleInput, setTitleInput] = useState<string | null>(null); // null = "still the default"
  const [date, setDate] = useState(format(now, "yyyy-MM-dd"));
  const [time, setTime] = useState(format(now, "HH:mm"));
  const [participantIds, setParticipantIds] = useState<number[]>([]);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [minutes, setMinutes] = useState("");
  const [errors, setErrors] = useState<{ title?: string; date?: string; minutes?: string }>({});

  const defaultTitle = tab === "upload" && file ? titleFromFileName(file.name) || "Untitled meeting" : "Untitled meeting";
  const title = titleInput ?? defaultTitle;

  const personOptions = useMemo(
    () => (people.data ?? []).map((p) => ({ id: p.id, label: p.name, leading: <PersonAvatar name={p.name} color={p.avatar_color} size="xs" /> })),
    [people.data],
  );
  const tagOptions = useMemo(
    () =>
      (tags.data ?? []).map((t) => ({
        id: t.id,
        label: t.name,
        leading: <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: t.color }} />,
      })),
    [tags.data],
  );
  const addPerson = async (name: string) => {
    try {
      return (await createPerson.mutateAsync({ name })).id;
    } catch {
      return null;
    }
  };
  const addTag = async (name: string) => {
    try {
      return (await createTag.mutateAsync({ name })).id;
    } catch {
      return null;
    }
  };

  const canCreate = tab === "manual" ? true : ready !== null;

  const submit = async () => {
    const iso = localDateTimeToIso(date, time);
    const minutesValue = minutes.trim() === "" ? null : Number(minutes);
    const next = {
      title: validateTitle(title) ?? undefined,
      date: iso ? undefined : "Enter a valid date.",
      minutes: minutesValue !== null && (!Number.isFinite(minutesValue) || minutesValue < 0 || minutesValue > 1440) ? "Enter a duration between 0 and 1440 minutes." : undefined,
    };
    setErrors(next);
    if (next.title || next.date || next.minutes || !iso) return;

    let transcriptText: string | undefined;
    if (tab !== "manual") {
      if (!ready) return;
      transcriptText = ready.source.kind === "file" ? await ready.source.file.text() : ready.source.text;
    }
    create.mutate(
      {
        title: title.trim(),
        meeting_date: iso,
        platform: "upload",
        participant_ids: participantIds,
        ...(tab === "manual" ? { tag_ids: tagIds, duration_seconds: minutesValue === null ? undefined : Math.round(minutesValue * 60) } : {}),
        ...(transcriptText ? { transcript_text: transcriptText } : {}),
      },
      {
        onSuccess: (meeting) => {
          onOpenChange(false);
          if (tab === "manual") {
            notify.success("Meeting created");
            router.push(`/meetings/${meeting.id}`);
          } else {
            notify.success("Uploaded — processing your meeting");
            router.push("/meeting-status");
          }
        },
      },
    );
  };

  return (
    <Modal
      open
      onOpenChange={(next) => !create.isPending && onOpenChange(next)}
      title="New meeting"
      description="Add a transcript to generate notes, or create an empty meeting."
      className="sm:max-w-[600px]"
      onSubmit={() => void submit()}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancel
          </Button>
          <SubmitButton type="submit" pending={create.isPending} disabled={!canCreate}>
            {tab === "manual" ? "Create meeting" : "Create & process"}
          </SubmitButton>
        </>
      }
    >
      <Tabs value={tab} onValueChange={(value) => setTab(value as NewMeetingTab)} className="gap-4">
        <TabsList variant="line" className="h-9 gap-5 bg-transparent p-0">
          <TabsTrigger value="upload" className="flex-none rounded-none px-1 text-sm">
            Upload file
          </TabsTrigger>
          <TabsTrigger value="paste" className="flex-none rounded-none px-1 text-sm">
            Paste transcript
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex-none rounded-none px-1 text-sm">
            Enter manually
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <TranscriptInput mode="upload" file={file} onFileChange={setFile} text="" onTextChange={() => undefined} onReady={setReady} />
        </TabsContent>
        <TabsContent value="paste">
          <TranscriptInput mode="paste" file={null} onFileChange={() => undefined} text={text} onTextChange={setText} onReady={setReady} />
        </TabsContent>
        <TabsContent value="manual">
          <p className="rounded-lg bg-surface-subtle px-3 py-2 text-xs text-text-secondary">
            This creates a meeting without a transcript. You can upload or paste one later from the meeting page.
          </p>
        </TabsContent>
      </Tabs>

      <FormField label="Title" htmlFor="new-title" error={errors.title}>
        <Input id="new-title" value={title} onChange={(event) => setTitleInput(event.target.value)} aria-invalid={errors.title ? true : undefined} maxLength={300} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Date" htmlFor="new-date" error={errors.date}>
          <Input id="new-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-invalid={errors.date ? true : undefined} />
        </FormField>
        <FormField label="Time" htmlFor="new-time">
          <Input id="new-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        </FormField>
      </div>
      <FormField
        label={tab === "manual" ? "Participants" : "Additional participants"}
        htmlFor="new-participants"
        hint={tab === "manual" ? undefined : "Speakers in the transcript are added automatically."}
      >
        <MultiSelect
          id="new-participants"
          options={personOptions}
          value={participantIds}
          onChange={setParticipantIds}
          placeholder="Add participants"
          searchPlaceholder="Search or add a person"
          onCreate={addPerson}
          creating={createPerson.isPending}
        />
      </FormField>
      {tab === "manual" && (
        <>
          <FormField label="Duration (minutes)" htmlFor="new-duration" error={errors.minutes} hint="Optional">
            <Input
              id="new-duration"
              type="number"
              inputMode="numeric"
              min={0}
              max={1440}
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              aria-invalid={errors.minutes ? true : undefined}
            />
          </FormField>
          <FormField label="Tags" htmlFor="new-tags">
            <MultiSelect
              id="new-tags"
              options={tagOptions}
              value={tagIds}
              onChange={setTagIds}
              placeholder="Add tags"
              searchPlaceholder="Search or create a tag"
              onCreate={addTag}
              creating={createTag.isPending}
            />
          </FormField>
        </>
      )}
    </Modal>
  );
}

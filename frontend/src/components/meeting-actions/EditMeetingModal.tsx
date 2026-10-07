"use client";

import { format } from "date-fns";
import { useMemo, useState } from "react";

import { FormField } from "@/components/common/FormField";
import { Modal } from "@/components/common/Modal";
import { MultiSelect } from "@/components/common/MultiSelect";
import { PersonAvatar } from "@/components/common/PersonAvatar";
import { SubmitButton } from "@/components/common/SubmitButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreatePerson, useCreateTag, useUpdateMeeting } from "@/hooks/useMeetingMutations";
import { usePeople } from "@/hooks/usePeople";
import { useTags } from "@/hooks/useTags";
import type { MeetingDetail } from "@/lib/api/types";
import { localDateTimeToIso, validateTitle } from "@/lib/validation";

interface EditMeetingModalProps {
  meeting: MeetingDetail | null;
  onOpenChange: (open: boolean) => void;
}

/** Edit title, date/time, participants and tags. Mounted only while open so its state resets. */
export function EditMeetingModal({ meeting, onOpenChange }: EditMeetingModalProps) {
  return meeting ? <EditForm meeting={meeting} onOpenChange={onOpenChange} /> : null;
}

function EditForm({ meeting, onOpenChange }: { meeting: MeetingDetail; onOpenChange: (open: boolean) => void }) {
  const start = new Date(meeting.meeting_date);
  const [title, setTitle] = useState(meeting.title);
  const [date, setDate] = useState(format(start, "yyyy-MM-dd"));
  const [time, setTime] = useState(format(start, "HH:mm"));
  const [participantIds, setParticipantIds] = useState(meeting.participants.map((p) => p.id));
  const [tagIds, setTagIds] = useState(meeting.tags.map((t) => t.id));
  const [errors, setErrors] = useState<{ title?: string; date?: string }>({});

  const people = usePeople();
  const tags = useTags();
  const createPerson = useCreatePerson();
  const createTag = useCreateTag();
  const update = useUpdateMeeting(meeting.id);

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
      return null; // the mutation already showed the error toast
    }
  };
  const addTag = async (name: string) => {
    try {
      return (await createTag.mutateAsync({ name })).id;
    } catch {
      return null;
    }
  };

  const submit = () => {
    const iso = localDateTimeToIso(date, time);
    const next = { title: validateTitle(title) ?? undefined, date: iso ? undefined : "Enter a valid date." };
    setErrors(next);
    if (next.title || next.date || !iso) return;
    update.mutate(
      { title: title.trim(), meeting_date: iso, participant_ids: participantIds, tag_ids: tagIds },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Modal
      open
      onOpenChange={(open) => !update.isPending && onOpenChange(open)}
      title="Edit meeting details"
      className="sm:max-w-[500px]"
      onSubmit={submit}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            Cancel
          </Button>
          <SubmitButton type="submit" pending={update.isPending}>
            Save changes
          </SubmitButton>
        </>
      }
    >
      <FormField label="Title" htmlFor="edit-title" error={errors.title}>
        <Input
          id="edit-title"
          value={title}
          autoFocus
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={errors.title ? true : undefined}
          maxLength={300}
        />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Date" htmlFor="edit-date" error={errors.date}>
          <Input id="edit-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-invalid={errors.date ? true : undefined} />
        </FormField>
        <FormField label="Time" htmlFor="edit-time">
          <Input id="edit-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        </FormField>
      </div>
      <FormField label="Participants" htmlFor="edit-participants">
        <MultiSelect
          id="edit-participants"
          options={personOptions}
          value={participantIds}
          onChange={setParticipantIds}
          placeholder="Add participants"
          searchPlaceholder="Search or add a person"
          onCreate={addPerson}
          creating={createPerson.isPending}
        />
      </FormField>
      <FormField label="Tags" htmlFor="edit-tags">
        <MultiSelect
          id="edit-tags"
          options={tagOptions}
          value={tagIds}
          onChange={setTagIds}
          placeholder="Add tags"
          searchPlaceholder="Search or create a tag"
          onCreate={addTag}
          creating={createTag.isPending}
        />
      </FormField>
    </Modal>
  );
}

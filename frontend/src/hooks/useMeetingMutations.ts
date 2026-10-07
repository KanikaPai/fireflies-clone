import { bulkDeleteMeetings, deleteMeeting, regenerateSummary, updateMeeting } from "@/lib/api/meetings";
import { createPerson } from "@/lib/api/people";
import { createTag } from "@/lib/api/tags";
import type { MeetingUpdate, PersonCreate, TagCreate } from "@/lib/api/types";

import { invalidate } from "./invalidation";
import { queryKeys } from "./queryKeys";
import { useApiMutation } from "./useApiMutation";

/** PATCH a meeting (title, date, participants, tags, privacy). The response replaces the cached detail. */
export function useUpdateMeeting(id: number, successMessage: string | null = "Meeting updated") {
  return useApiMutation({
    mutationFn: (changes: MeetingUpdate) => updateMeeting(id, changes),
    success: successMessage,
    errorFallback: "Could not update the meeting",
    onSuccess: (meeting, _vars, qc) => qc.setQueryData(queryKeys.meetings.detail(id), meeting),
    invalidate: (qc) => invalidate.meetingEdited(qc),
  });
}

/** Delete one meeting (DELETE) or several (one bulk-delete transaction). */
export function useDeleteMeetings() {
  return useApiMutation({
    mutationFn: async (ids: number[]) => (ids.length === 1 ? (await deleteMeeting(ids[0]), 1) : (await bulkDeleteMeetings(ids)).deleted),
    success: (deleted) => (deleted === 1 ? "Meeting deleted" : `${deleted} meetings deleted`),
    errorFallback: "Could not delete the meeting",
    invalidate: (qc, _deleted, ids) => invalidate.meetingsDeleted(qc, ids),
  });
}

export function useRegenerateNotes(id: number) {
  return useApiMutation({
    mutationFn: () => regenerateSummary(id),
    success: "Notes regenerated",
    errorFallback: "Could not regenerate notes",
    onSuccess: (meeting, _vars, qc) => qc.setQueryData(queryKeys.meetings.detail(id), meeting),
    invalidate: (qc) => invalidate.meetingEdited(qc),
  });
}

export function useCreatePerson() {
  return useApiMutation({
    mutationFn: (body: PersonCreate) => createPerson(body),
    success: (person) => `Added ${person.name}`,
    errorFallback: "Could not add the person",
    invalidate: (qc) => invalidate.peopleChanged(qc),
  });
}

export function useCreateTag() {
  return useApiMutation({
    mutationFn: (body: TagCreate) => createTag(body),
    success: (tag) => `Created tag “${tag.name}”`,
    errorFallback: "Could not create the tag",
    invalidate: (qc) => invalidate.tagsChanged(qc),
  });
}

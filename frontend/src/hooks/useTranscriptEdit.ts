import { reassignSpeaker, replaceInTranscript } from "@/lib/api/meetings";
import { updateSegment } from "@/lib/api/segments";
import type { ReassignRequest, ReplaceRequest, Segment, SegmentUpdate, Transcript } from "@/lib/api/types";
import { pluralize } from "@/components/common/formatters";

import { invalidate } from "./invalidation";
import { queryKeys } from "./queryKeys";
import { useApiMutation } from "./useApiMutation";

/**
 * Edit one segment's text or speaker. The transcript cache is patched with the server's answer (so only the
 * edited segment re-renders); insights and global search are refetched since they derive from the text.
 * No success toast: the segment shows its own "Saved" indicator.
 */
export function useUpdateSegment(meetingId: number) {
  return useApiMutation({
    mutationFn: ({ id, changes }: { id: number; changes: SegmentUpdate }) => updateSegment(id, changes),
    success: null,
    errorFallback: "Could not save the change",
    onSuccess: (segment: Segment, _vars, qc) =>
      qc.setQueryData<Transcript>(queryKeys.meetings.transcript(meetingId), (transcript) =>
        transcript && { ...transcript, segments: transcript.segments.map((s) => (s.id === segment.id ? segment : s)) },
      ),
    invalidate: (qc) => invalidate.transcriptEdited(qc, meetingId),
  });
}

export function useReplaceInTranscript(meetingId: number) {
  return useApiMutation({
    mutationFn: (body: ReplaceRequest) => replaceInTranscript(meetingId, body),
    success: ({ replaced, segment_ids }) =>
      replaced === 0 ? "No matches to replace" : `Replaced ${pluralize(replaced, "occurrence")} in ${pluralize(segment_ids.length, "segment")}`,
    errorFallback: "Could not replace the text",
    invalidate: (qc) => invalidate.transcriptEdited(qc, meetingId, { refetchTranscript: true }),
  });
}

export function useReassignSpeaker(meetingId: number) {
  return useApiMutation({
    mutationFn: (body: ReassignRequest & { toName: string }) =>
      reassignSpeaker(meetingId, { from_person_id: body.from_person_id, to_person_id: body.to_person_id }),
    success: ({ reassigned }, { toName }) => `Reassigned ${pluralize(reassigned, "segment")} to ${toName}`,
    errorFallback: "Could not reassign the speaker",
    invalidate: (qc) => invalidate.transcriptEdited(qc, meetingId, { refetchTranscript: true }),
  });
}

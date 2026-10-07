import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "./queryKeys";

/**
 * The one cache-invalidation map. Every mutation names the *kind of change* it made and calls the matching
 * function here, so nobody has to remember which screens show which data.
 *
 * | Change                         | Refetched / dropped                                                          | Why                                                      |
 * | ------------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------------------- |
 * | meeting metadata edited        | meetings.* (list, detail, ...), action-items, people, tags                   | list rows + Home feed + Tasks show title/people/tags     |
 * | meetings deleted               | meetings.* (detail dropped), action-items, search, people                    | counts, feed, global search and people stats change      |
 * | action item added/edited/gone  | action-items.*, meetings.* (detail has items; list has counts)               | Tasks tab, meeting page and the list-row counts          |
 * | transcript text/speaker edited | meetings.transcript + insights of that meeting, search                       | talk time / filters / FTS follow the text                |
 * | person or tag created          | people / tags                                                                | pickers and the Contacts page                            |
 * | share / privacy changed        | meetings.shares of that meeting (+ detail for privacy)                       | Share modal                                              |
 *
 * Invalidating marks queries stale and refetches only the ones currently on screen.
 */
export const invalidate = {
  meetingEdited: (qc: QueryClient): Promise<unknown> =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.meetings.all }),
      qc.invalidateQueries({ queryKey: queryKeys.actionItems.all }),
      qc.invalidateQueries({ queryKey: queryKeys.people }),
      qc.invalidateQueries({ queryKey: queryKeys.tags }),
    ]),

  meetingsDeleted: (qc: QueryClient, ids: number[]): Promise<unknown> => {
    // Drop the deleted meetings' own queries so nothing refetches (and 404s) for them.
    for (const id of ids) {
      qc.removeQueries({ queryKey: queryKeys.meetings.detail(id) });
      qc.removeQueries({ queryKey: queryKeys.meetings.transcript(id) });
      qc.removeQueries({ queryKey: queryKeys.meetings.insights(id) });
      qc.removeQueries({ queryKey: queryKeys.meetings.shares(id) });
    }
    return Promise.all([
      qc.invalidateQueries({ queryKey: ["meetings", "list"] }),
      qc.invalidateQueries({ queryKey: queryKeys.actionItems.all }),
      qc.invalidateQueries({ queryKey: queryKeys.searchAll }),
      qc.invalidateQueries({ queryKey: queryKeys.people }),
    ]);
  },

  actionItemsChanged: (qc: QueryClient): Promise<unknown> =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.actionItems.all }),
      qc.invalidateQueries({ queryKey: queryKeys.meetings.all }),
    ]),

  /** The transcript itself is updated in place by the caller; only derived data is refetched here. */
  transcriptEdited: (qc: QueryClient, meetingId: number, options: { refetchTranscript?: boolean } = {}): Promise<unknown> =>
    Promise.all([
      options.refetchTranscript ? qc.invalidateQueries({ queryKey: queryKeys.meetings.transcript(meetingId) }) : null,
      qc.invalidateQueries({ queryKey: queryKeys.meetings.insights(meetingId) }),
      qc.invalidateQueries({ queryKey: queryKeys.searchAll }),
    ]),

  peopleChanged: (qc: QueryClient): Promise<unknown> => qc.invalidateQueries({ queryKey: queryKeys.people }),
  tagsChanged: (qc: QueryClient): Promise<unknown> => qc.invalidateQueries({ queryKey: queryKeys.tags }),

  sharingChanged: (qc: QueryClient, meetingId: number): Promise<unknown> =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.meetings.shares(meetingId) }),
      qc.invalidateQueries({ queryKey: queryKeys.meetings.detail(meetingId) }),
    ]),
};

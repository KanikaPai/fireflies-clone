/** Friendly aliases over the generated OpenAPI types (run `npm run gen:api` to refresh schema.d.ts). */
import type { components, paths } from "./schema";

type Schemas = components["schemas"];

export type User = Schemas["UserOut"];
export type Person = Schemas["PersonOut"];
export type PersonWithStats = Schemas["PersonWithStats"];
export type PersonBrief = Schemas["PersonBrief"];
export type Tag = Schemas["TagOut"];
export type MeetingListItem = Schemas["MeetingListItem"];
export type MeetingPage = Schemas["MeetingPage"];
export type MeetingDetail = Schemas["MeetingDetail"];
export type MeetingUpdate = Schemas["MeetingUpdate"];
export type Transcript = Schemas["TranscriptOut"];
export type Segment = Schemas["SegmentOut"];
export type Insights = Schemas["MeetingInsights"];
export type FilterCategory = Schemas["FilterCategory"];
export type SpeakerInsight = Schemas["SpeakerInsight"];
export type SummaryBullet = Schemas["SummaryBullet"];
export type Chapter = Schemas["ChapterOut"];
export type ActionItem = Schemas["ActionItemOut"];
export type ActionItemWithMeeting = Schemas["ActionItemWithMeeting"];
export type ActionItemUpdate = Schemas["ActionItemUpdate"];
export type ActionItemCreate = Schemas["ActionItemCreate"];
export type PersonCreate = Schemas["PersonCreate"];
export type TagCreate = Schemas["TagCreate"];
export type SegmentUpdate = Schemas["SegmentUpdate"];
export type ReplaceRequest = Schemas["ReplaceRequest"];
export type ReplaceResult = Schemas["ReplaceResult"];
export type ReassignRequest = Schemas["ReassignRequest"];
export type ReassignResult = Schemas["ReassignResult"];
export type Share = Schemas["ShareOut"];
export type Privacy = Schemas["Privacy"];
export type BulkDeleteResult = Schemas["MeetingBulkDeleteResult"];
export type SearchResponse = Schemas["SearchResponse"];
export type Platform = Schemas["Platform"];
export type MeetingStatus = Schemas["MeetingStatus"];

export type MeetingListParams = NonNullable<paths["/api/meetings"]["get"]["parameters"]["query"]>;

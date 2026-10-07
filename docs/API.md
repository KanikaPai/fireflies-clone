# API reference

Base URL: `http://localhost:8000`. Interactive docs: `/docs` (Swagger UI) and `/redoc`; schema at `/openapi.json`.

- All routes are under `/api`. Auth is mocked: every request acts as the default seeded user (`GET /api/me`).
  The `get_current_user` dependency in `backend/app/deps.py` is the single place to swap in real auth.
- Errors always use `{ "detail": ... }`: a string for domain errors, a list of field errors for request validation (422).
- Datetimes are ISO 8601 in UTC (`2026-10-06T10:00:00Z`). Naive datetimes in requests are treated as UTC.
- Architecture: routers (`app/routers`) handle HTTP only; logic lives in `app/services`; request/response shapes in `app/schemas`.

## Endpoints

| Method | Path | Description | Success |
| --- | --- | --- | --- |
| GET | `/api/health` | Health check | 200 |
| GET | `/api/me` | Current (mocked) user | 200 |
| GET | `/api/meetings` | List meetings: `q`, `participant_id`, `tag_id` (repeatable; a meeting matches if it has any of the tags), `date_from`, `date_to`, `status` (`processing`\|`ready`\|`failed`), `platform`, `min_duration`, `max_duration` (seconds, inclusive), `processed_since` (ISO time; meetings whose processing finished at or after it), `sort` (`recent`\|`oldest`), `page`, `page_size` (1-100, default 20) | 200 |
| POST | `/api/transcripts/parse` | Dry run: multipart `file` or JSON `{text}` → `{format_detected, segment_count, duration_seconds, speakers[{name, matched_person_id}], preview[5], warnings}`. Writes nothing. 413 over 5 MB, 415 bad extension, 422 empty/unparseable | 200 |
| POST | `/api/meetings` | Create a meeting from JSON: `title`, `meeting_date`, optional `participants` (names), `participant_ids`, `tag_ids`, `duration_seconds`, `transcript_text` (format detected). With a transcript it is saved as `processing` and summarised in a background task; without one it is `ready` | 201 |
| POST | `/api/meetings/upload` | Create a meeting from a `.txt`, `.vtt` or `.json` transcript (multipart); saved as `processing`, then processed in the background | 201 |
| POST | `/api/meetings/{id}/retry` | Re-run processing of a `failed` meeting (409 otherwise) | 200 |
| POST | `/api/meetings/{id}/transcript` | Attach a transcript (multipart `file` or JSON `{text}`) to a meeting that has none; starts processing. 409 if it already has one | 200 |
| GET | `/api/me/settings` | The user's settings | 200 |
| PATCH | `/api/me/settings` | Partial update: `default_privacy`, `auto_join`, `recap_recipients`, `language`, `email_notes_enabled`, `notify_on_ready`, `theme`. Unknown fields 422, null 400 | 200 |
| PATCH | `/api/me` | Update `name` / `email` | 200 |
| GET | `/api/meetings/{id}` | Meeting detail: participants, tags, summary, chapters, action items | 200 |
| PATCH | `/api/meetings/{id}` | Update `title`, `meeting_date`, `participant_ids`, `tag_ids`, `privacy` | 200 |
| POST | `/api/meetings/bulk-delete` | `{ids}` → `{deleted}`; one transaction; 404 (nothing deleted) if any id is unknown, 422 for an empty list | 200 |
| GET | `/api/meetings/{id}/shares` | Emails the meeting is shared with | 200 |
| POST | `/api/meetings/{id}/shares` | `{email}`; recorded only, no email is sent; 409 if already shared | 201 |
| DELETE | `/api/meetings/{id}/shares/{share_id}` | Stop sharing with that email | 204 |
| PATCH | `/api/segments/{id}` | Edit `text` (non-empty) and/or `speaker_id` (must be a participant). Timings never change | 200 |
| POST | `/api/meetings/{id}/transcript/replace` | `{find, replace, case_sensitive?, segment_ids?}` → `{replaced, segment_ids}`; literal match, one transaction, 422 if a segment would become empty | 200 |
| POST | `/api/meetings/{id}/speakers/reassign` | `{from_person_id, to_person_id}` → `{reassigned}`; both must be participants | 200 |
| DELETE | `/api/meetings/{id}` | Delete a meeting and everything under it | 204 |
| GET | `/api/meetings/{id}/insights` | Smart Search data: per-speaker talk time/WPM, transcript filter categories (questions, tasks, metrics, date & time, pricing) with segment ids, and sentiment percentages | 200 |
| GET | `/api/meetings/{id}/highlights` | Highlights and comments on the transcript, in timestamp order (`?kind=highlight\|comment`). Each has `segment_id`, `segment_start_ms`, `kind`, `note`, `start_char`/`end_char`, `quote`, `author` | 200 |
| POST | `/api/meetings/{id}/highlights` | `{segment_id, kind, start_char, end_char, note}`. A highlight needs a range; a comment needs a `note` (max 2000) and may omit the range (whole segment). 422 if the segment is not in this meeting, the range is empty/reversed/outside the segment text/only whitespace, or one of `start_char`/`end_char` is missing | 201 |
| DELETE | `/api/highlights/{id}` | Delete a highlight or comment | 204 |
| POST | `/api/meetings/{id}/ask` | AskFred. Body `{question (1-1000 chars), history: [{role: "user"\|"assistant", content}] (max 20)}` → `{answer_markdown, citations: [{segment_id, start_ms, speaker}], source: "llm"\|"heuristic"}`. Answers only from this meeting. With `ANTHROPIC_API_KEY` set, Claude answers from the summary, action items and id-prefixed transcript (30 s timeout, citations as `[#id]`, ids not in the meeting dropped) and any error falls back to the built-in engine. The built-in engine is deterministic and handles action items, summary/decisions, a follow-up email template, "what did <person> say", metadata questions (participants, duration, date, talk time), status questions ("what was decided about X": matching summary bullets first, then quotes) and BM25-ranked search with stemming and synonyms (top 3 quoted lines plus the matching summary note); with no match it answers "I couldn't find that exact topic in this meeting. Here's what was covered:" followed by the top three summary bullets (with timestamps and citations) and three topics to try. The response shape is unchanged. 422 for an empty or too-long question | 200 |
| GET | `/api/meetings/{id}/export` | Download as a file: `format=txt` (default; `[mm:ss] Speaker: text`), `md` (title, metadata, summary, notes, action items as checkboxes, transcript), `vtt` (WebVTT with `<v Speaker>` voice tags) or `json` (the meeting detail plus a `transcript` array). `Content-Disposition` filename like `sprint-24-planning-2026-10-06.md`. `txt` and `vtt` parse back through the upload parser. 422 for another format | 200 |
| GET | `/api/meetings/{id}/transcript` | Ordered segments with speakers; `?q=` also returns `matching_segment_ids` | 200 |
| POST | `/api/meetings/{id}/summary/regenerate` | Regenerate overview, keywords and chapters | 200 |
| POST | `/api/meetings/{id}/action-items` | Add an action item | 201 |
| GET | `/api/action-items` | All action items across meetings, newest meeting first; `?completed=true\|false`. Each item includes `meeting_id`, `meeting_title`, `meeting_date` and the assignee | 200 |
| PATCH | `/api/action-items/{id}` | Update `text`, `assignee_id`, `source_segment_id`, `is_completed`, `due_date` (422 for an unknown assignee or a segment of another meeting) | 200 |
| DELETE | `/api/action-items/{id}` | Delete an action item | 204 |
| GET | `/api/people` | List people with `meeting_count` and `last_meeting_date` (`?q=` filters by name) | 200 |
| POST | `/api/people` | Create a person (409 on duplicate email) | 201 |
| GET | `/api/tags` | List tags | 200 |
| POST | `/api/tags` | Create a tag (409 on duplicate name) | 201 |
| GET | `/api/search` | Global search: `q`, `limit` (meetings, default 20), `matches_per_meeting` (default 3), `per_category` (default 10). Returns `results` (meetings with title and FTS transcript matches), plus category-tagged `action_items` and `summary_bullets` (each capped at `per_category`, with `*_total` counts). All snippets are HTML-escaped with matches in `<mark>` | 200 |

Status codes: `413` payload over 5 MB, `415` unsupported file extension, `400` bad input that is valid JSON (unknown ids in a meeting PATCH, unsupported file type), `404` missing resource,
`409` conflict, `422` validation failure or unparseable transcript.

## Examples

### List meetings

```bash
curl 'http://localhost:8000/api/meetings?q=sprint&sort=recent&page=1&page_size=10'
```

```json
{
  "items": [
    {
      "id": 1,
      "title": "Sprint 24 Planning",
      "meeting_date": "2026-10-06T10:00:00Z",
      "duration_seconds": 1158,
      "platform": "zoom",
      "status": "ready",
      "participants": [{ "id": 1, "name": "Jordan Lee", "avatar_color": "#6366f1" }],
      "tags": [{ "id": 1, "name": "Engineering", "color": "#0ea5e9" }],
      "action_item_count": 5,
      "open_action_item_count": 3
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 10
}
```

Participants are listed host first. Action-item counts come from one aggregate query, and participants/tags are
loaded with `selectinload`, so the query count does not grow with the page size.

### Meeting detail

```bash
curl http://localhost:8000/api/meetings/1
```

```json
{
  "id": 1,
  "title": "Sprint 24 Planning",
  "meeting_date": "2026-10-06T10:00:00Z",
  "duration_seconds": 1158,
  "platform": "zoom",
  "status": "ready",
  "media_url": null,
  "created_at": "2026-10-06T10:19:18Z",
  "updated_at": "2026-10-06T10:19:18Z",
  "participants": [{ "id": 1, "name": "Jordan Lee", "email": "jordan.lee@acme.io", "avatar_color": "#6366f1", "role": "host" }],
  "tags": [{ "id": 1, "name": "Engineering", "color": "#0ea5e9" }],
  "summary": {
    "overview": "The team reviewed Sprint 23 ...",
    "keywords": ["sprint planning", "capacity", "meeting search"],
    "bullets": [{ "label": "Capacity", "text": "Sprint 24 capacity is 28 points …", "start_ms": 451000 }],
    "generated_by": "seed",
    "created_at": "2026-10-06T10:19:18Z"
  },
  "chapters": [{ "id": 1, "title": "Sprint 23 review", "start_ms": 3000, "end_ms": 229000, "summary": "The team reviewed Sprint 23 …", "order_index": 0, "points": [{ "text": "Export edge cases cost two days …", "start_ms": 101817 }] }],
  "action_items": [
    {
      "id": 1, "meeting_id": 1, "text": "Create tickets for the search API …",
      "assignee": { "id": 3, "name": "Marcus Chen", "avatar_color": "#0ea5e9" },
      "source_segment_id": 24, "source_start_ms": 151000,
      "is_completed": true, "due_date": "2026-10-07",
      "created_at": "2026-10-06T10:19:18Z", "updated_at": "2026-10-06T10:19:18Z"
    }
  ]
}
```

`summary.bullets` and `chapters[].points` carry `start_ms`, the segment where the point is discussed (clients seek the player to it). `GET /api/meetings` also returns `summary_bullets` (the first five bullets) on every item, loaded without extra per-row queries.

`generated_by` is `seed` (seed data), `heuristic` (built-in generator) or `llm` (Claude).

### Transcript, with a text filter

```bash
curl 'http://localhost:8000/api/meetings/6/transcript?q=runway'
```

```json
{
  "meeting_id": 6,
  "segments": [
    {
      "id": 265, "sequence_index": 12, "start_ms": 281000, "end_ms": 303000,
      "text": "On cash, we ended the quarter with four point one million …",
      "speaker": { "id": 8, "name": "Aisha Rahman", "avatar_color": "#14b8a6" }
    }
  ],
  "matching_segment_ids": [265, 289, 291]
}
```

All segments are always returned; `matching_segment_ids` is `null` when `q` is omitted and the ids of matching
segments otherwise (the client highlights them and can jump between them).

### Create a meeting from pasted text

```bash
curl -X POST http://localhost:8000/api/meetings -H 'Content-Type: application/json' -d '{
  "title": "Launch planning",
  "meeting_date": "2026-10-01T15:00:00Z",
  "platform": "zoom",
  "participants": ["Ana Lopez", "Ben Carter"],
  "transcript_text": "[00:00] Ana Lopez: Welcome everyone, today we plan the launch.\n[00:15] Ben Carter: I'"'"'ll send the launch checklist by Friday."
}'
```

Returns `201` with the full meeting detail. The first listed participant is the host; speakers missing from
`participants` are added as attendees; people are matched by name case-insensitively and created if new. With a
transcript the meeting is `ready` and gets a generated summary, chapters and action items; **without** one it is
created as `processing` with no summary.

### Upload a transcript file

```bash
curl -X POST http://localhost:8000/api/meetings/upload \
  -F file=@backend/sample_transcripts/weekly_standup.vtt \
  -F title='Weekly standup' -F meeting_date=2026-10-05T09:00:00Z -F platform=zoom
```

Form fields: `file` (required), `title` (required), `meeting_date` (required), `platform` (default `upload`).
Maximum size 5 MB, UTF-8 only. Errors:

```json
{ "detail": "Unsupported file type '.pdf'. Upload a .txt, .vtt or .json transcript." }
```

### Transcript formats

| Format | Rules |
| --- | --- |
| `.txt` | `Speaker Name: text`, optionally prefixed `[mm:ss]` or `[hh:mm:ss]`. Lines without a speaker continue the previous turn. Missing timestamps are estimated from word count (about 1.6 words/s plus short pauses, deterministic). |
| `.vtt` | Standard WebVTT cues. Speaker from `<v Name>` or a `Name:` prefix, otherwise `Unknown Speaker`. Cue times are used exactly. |
| `.json` | Array (or `{ "segments": [...] }`) of `{ speaker, start, end, text }`. Seconds vs milliseconds is auto-detected: fractional values mean seconds; otherwise values ≥ 100000, or a median segment length over 300, mean milliseconds. `end` is optional. |

Empty files and unparseable content return `422` with a message. Segments are sorted, never overlap, and
`duration_seconds` is taken from the last segment's end.

### Update a meeting

```bash
curl -X PATCH http://localhost:8000/api/meetings/1 -H 'Content-Type: application/json' \
  -d '{"title": "Sprint 24 Planning (final)", "tag_ids": [1, 2], "participant_ids": [1, 2, 3]}'
```

Only the fields you send are changed. `participant_ids` / `tag_ids` replace the whole set (existing participants keep
their role). Unknown ids return `400`.

### Processing

A meeting created with a transcript is returned with `status: "processing"` and no summary; a background task then
generates the summary, chapters and action items and sets `status: "ready"` (or `"failed"` plus `error_message`).
Clients poll `GET /api/meetings` / `GET /api/meetings/{id}` while anything is processing. Configuration:
`PROCESSING_DELAY_SECONDS` (default 4) simulates processing time (0 in tests); `PROCESSING_FAIL_PATTERN=<text>` makes
meetings whose title contains the text fail, to demo the failed → retry path. On startup, meetings still in
`processing` are re-queued (those without a transcript are marked ready).

### Edit the transcript

```bash
# change one segment (text is trimmed; empty text is a 422; the speaker must be a participant)
curl -X PATCH http://localhost:8000/api/segments/42 -H 'Content-Type: application/json' -d '{"text": "Revised wording."}'

# literal find & replace across the meeting (optionally limited with "segment_ids")
curl -X POST http://localhost:8000/api/meetings/1/transcript/replace -H 'Content-Type: application/json' \
  -d '{"find": "Q3", "replace": "Q4", "case_sensitive": false}'
# -> {"replaced": 3, "segment_ids": [5, 9, 14]}

# move every segment of one speaker to another participant
curl -X POST http://localhost:8000/api/meetings/1/speakers/reassign -H 'Content-Type: application/json' \
  -d '{"from_person_id": 4, "to_person_id": 2}'
# -> {"reassigned": 12}
```

Edits only change text and speaker; `start_ms`/`end_ms` never move, so playback sync stays valid. The FTS index is
updated by a trigger (global search sees the new wording immediately) and insights are computed on read, so they follow.

### Action items

`GET /api/action-items?completed=false` returns every open task across meetings (used by the Home > Tasks tab):

```json
[{ "id": 7, "text": "Deliver empty-state designs", "is_completed": false, "assignee": { "id": 4, "name": "Sofia Alvarez", "avatar_color": "#f59e0b" }, "meeting_id": 1, "meeting_title": "Sprint 24 Planning", "meeting_date": "2026-10-06T10:00:00Z", "source_segment_id": 31, "source_start_ms": 412000, "due_date": "2026-10-10", "created_at": "...", "updated_at": "..." }]
```

```bash
curl -X POST http://localhost:8000/api/meetings/1/action-items -H 'Content-Type: application/json' \
  -d '{"text": "Book the retro room", "assignee_id": 2, "due_date": "2026-11-01"}'

curl -X PATCH http://localhost:8000/api/action-items/36 -H 'Content-Type: application/json' \
  -d '{"is_completed": true}'

# null clears an optional field
curl -X PATCH http://localhost:8000/api/action-items/36 -H 'Content-Type: application/json' \
  -d '{"assignee_id": null, "due_date": null}'
```

`source_segment_id` (on create) must belong to the same meeting. `text` and `is_completed` cannot be `null`.

### Global search

```bash
curl 'http://localhost:8000/api/search?q=runway&limit=5'
```

```json
{
  "query": "runway",
  "total_meetings": 1,
  "results": [
    {
      "meeting": { "id": 6, "title": "Q3 Board Update", "meeting_date": "2026-09-21T09:00:00Z", "platform": "teams" },
      "title_match": false,
      "match_count": 3,
      "matches": [
        {
          "segment_id": 289,
          "start_ms": 563000,
          "speaker": { "id": 8, "name": "Aisha Rahman", "avatar_color": "#14b8a6" },
          "snippet": "…nineteen months of <mark>runway</mark>. That's down from…"
        }
      ]
    }
  ]
}
```

- Backed by the SQLite FTS5 index `transcript_fts` (porter stemming, BM25 ranking); meetings are ordered by their best
  match. Meetings whose **title** contains every term are included and flagged `title_match`, listed first.
- Multiple terms are ANDed; the last term also matches as a prefix (type-ahead).
- **Input is sanitised** (`app/services/fts.py`): only word characters survive, and each term is double-quoted, so
  `" * ( ) AND OR NOT NEAR col:` and similar can never be interpreted as FTS syntax or cause a 500.
- `snippet` is HTML-safe: text is escaped and only `<mark>` tags are added, so it can be rendered with
  `dangerouslySetInnerHTML`.
- `match_count` is the number of matching segments (capped at 1000); `matches` is limited by `matches_per_meeting`.

### Meeting insights

```bash
curl http://localhost:8000/api/meetings/6/insights
```

```json
{
  "speakers": [{ "person": { "id": 6, "name": "Hannah Weiss", "avatar_color": "#8b5cf6" }, "talk_time_ms": 412000, "talk_time_pct": 38, "wpm": 104, "segment_count": 21 }],
  "filters": [{ "key": "questions", "label": "Questions", "count": 6, "segment_ids": [262, 270] }],
  "sentiment": { "positive_pct": 20, "neutral_pct": 70, "negative_pct": 10, "by_segment": [{ "segment_id": 262, "label": "neutral", "score": 0 }] }
}
```

Computed on every read by `app/services/insights.py`; nothing is stored. Percentages are whole numbers that sum to exactly 100. Filters and sentiment are heuristics (regex detectors and a small lexicon), not ML. Filter order is fixed: `date_time`, `metrics`, `questions`, `tasks`, `pricing`; `tasks` also includes segments linked to action items.

### Regenerate the summary

```bash
curl -X POST http://localhost:8000/api/meetings/1/summary/regenerate
```

Regenerates overview, keywords and chapters and returns the meeting detail. Action items are generated only if
the meeting has none, so manual edits are never lost. `400` if the meeting has no transcript.

### Summary generation

`app/services/summarizer.py` has one interface and two generators:

- **Heuristic (default)**: keywords by term frequency minus stopwords; 3-6 time-window chapters titled by their
  most distinctive terms; action items from cue phrases (`I'll`, `we need to`, `action item`, `follow up`,
  `by Friday`…), assigned to the speaker and linked to the segment, with `by <weekday>`/`tomorrow` deadlines
  resolved to `due_date`. `generated_by = "heuristic"`.
- **Claude**: used when `ANTHROPIC_API_KEY` is set (model from `ANTHROPIC_MODEL`, default `claude-sonnet-5-5`);
  returns structured JSON that is validated. Any error (network, auth, malformed output) falls back to the
  heuristic generator. `generated_by = "llm"`.

## Running the tests

```bash
cd backend && source .venv/bin/activate
pip install -r requirements-dev.txt
pytest
```

Tests use `TestClient` against a temporary SQLite database that is reseeded for every test.

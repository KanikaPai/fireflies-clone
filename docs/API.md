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
| GET | `/api/meetings` | List meetings: `q`, `participant_id`, `tag_id`, `date_from`, `date_to`, `status` (`processing`\|`ready`), `platform`, `min_duration`, `max_duration` (seconds, inclusive), `sort` (`recent`\|`oldest`), `page`, `page_size` (1-100, default 20) | 200 |
| POST | `/api/meetings` | Create a meeting from JSON (optionally with a pasted transcript) | 201 |
| POST | `/api/meetings/upload` | Create a meeting from a `.txt`, `.vtt` or `.json` transcript (multipart) | 201 |
| GET | `/api/meetings/{id}` | Meeting detail: participants, tags, summary, chapters, action items | 200 |
| PATCH | `/api/meetings/{id}` | Update `title`, `meeting_date`, `participant_ids`, `tag_ids` | 200 |
| DELETE | `/api/meetings/{id}` | Delete a meeting and everything under it | 204 |
| GET | `/api/meetings/{id}/transcript` | Ordered segments with speakers; `?q=` also returns `matching_segment_ids` | 200 |
| POST | `/api/meetings/{id}/summary/regenerate` | Regenerate overview, keywords and chapters | 200 |
| POST | `/api/meetings/{id}/action-items` | Add an action item | 201 |
| GET | `/api/action-items` | All action items across meetings, newest meeting first; `?completed=true\|false`. Each item includes `meeting_id`, `meeting_title`, `meeting_date` and the assignee | 200 |
| PATCH | `/api/action-items/{id}` | Update `text`, `assignee_id`, `is_completed`, `due_date` | 200 |
| DELETE | `/api/action-items/{id}` | Delete an action item | 204 |
| GET | `/api/people` | List people with `meeting_count` and `last_meeting_date` (`?q=` filters by name) | 200 |
| POST | `/api/people` | Create a person (409 on duplicate email) | 201 |
| GET | `/api/tags` | List tags | 200 |
| POST | `/api/tags` | Create a tag (409 on duplicate name) | 201 |
| GET | `/api/search` | Global full-text search: `q`, `limit` (meetings, default 20), `matches_per_meeting` (default 3) | 200 |

Status codes: `400` bad input that is valid JSON (unknown ids, unsupported file type), `404` missing resource,
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
    "generated_by": "seed",
    "created_at": "2026-10-06T10:19:18Z"
  },
  "chapters": [{ "id": 1, "title": "Sprint 23 review", "start_ms": 3000, "end_ms": 229000, "summary": "…", "order_index": 0 }],
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

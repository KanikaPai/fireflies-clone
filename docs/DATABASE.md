# Database

SQLite, accessed through SQLAlchemy 2.0 typed models (`backend/app/models/`). Foreign keys are enforced
(`PRAGMA foreign_keys=ON` on every connection, see `backend/app/db.py`). Tables are created on startup by
`init_db()`, then demo data is seeded if the database is empty.

## ER diagram

```mermaid
erDiagram
    users ||--o{ meetings : owns
    users ||--o| user_settings : configures
    users ||--o{ segment_highlights : writes
    meetings ||--o{ meeting_participants : has
    people ||--o{ meeting_participants : "attends"
    meetings ||--o{ transcript_segments : contains
    people ||--o{ transcript_segments : "speaks"
    meetings ||--o| summaries : "summarised by"
    meetings ||--o{ chapters : outlines
    meetings ||--o{ action_items : produces
    people |o--o{ action_items : "assigned to"
    transcript_segments |o--o{ action_items : "said in"
    transcript_segments ||--o{ segment_highlights : "highlighted by"
    meetings ||--o{ meeting_shares : "shared with"
    meetings ||--o{ meeting_tags : tagged
    tags ||--o{ meeting_tags : labels

    users {
        int id PK
        string name
        string email UK
        string avatar_url
        datetime created_at
    }
    people {
        int id PK
        string name
        string email UK "nullable"
        string avatar_color
    }
    meetings {
        int id PK
        int owner_id FK
        string title
        datetime meeting_date
        int duration_seconds
        enum platform "zoom|google_meet|teams|upload"
        string media_url "nullable"
        enum status "processing|ready|failed"
        text error_message "nullable; set when status is failed"
        enum privacy "link|teammates_participants|teammates|participants|participants_team|owner"
        datetime created_at
        datetime updated_at
    }
    user_settings {
        int user_id PK,FK
        enum default_privacy "same six values as meetings.privacy"
        enum auto_join "all|owned|teammates|invited"
        enum recap_recipients "everyone|team|me"
        string language
        bool email_notes_enabled
        bool notify_on_ready
        enum theme "light|dark|system"
        datetime updated_at
    }
    meeting_shares {
        int id PK
        int meeting_id FK
        string email "lower-cased; unique per meeting"
        datetime created_at
    }
    meeting_participants {
        int meeting_id PK,FK
        int person_id PK,FK
        enum role "host|attendee"
    }
    transcript_segments {
        int id PK
        int meeting_id FK
        int speaker_id FK
        int start_ms
        int end_ms
        text text
        int sequence_index
    }
    summaries {
        int id PK
        int meeting_id FK,UK
        text overview
        json keywords
        json bullets "label, text, start_ms"
        enum generated_by "seed|heuristic|llm"
        datetime created_at
    }
    chapters {
        int id PK
        int meeting_id FK
        string title
        int start_ms
        int end_ms
        text summary
        int order_index
        json points "text, start_ms"
    }
    action_items {
        int id PK
        int meeting_id FK
        text text
        int assignee_id FK "nullable"
        int source_segment_id FK "nullable"
        bool is_completed
        date due_date "nullable"
        datetime created_at
        datetime updated_at
    }
    tags {
        int id PK
        string name UK
        string color
    }
    meeting_tags {
        int meeting_id PK,FK
        int tag_id PK,FK
    }
    segment_highlights {
        int id PK
        int segment_id FK
        int user_id FK
        text note "nullable"
        datetime created_at
    }
```

`transcript_fts` (FTS5 virtual table, not shown) indexes `transcript_segments.text`; see [Search](#search).

## Tables

| Table | Purpose | Notes |
| --- | --- | --- |
| `users` | App accounts. Auth is mocked, so one default user is seeded. | `email` unique. |
| `people` | Participants/speakers, reused across meetings (separate from `users`, since most speakers never log in). | `email` unique, nullable. |
| `meetings` | One recorded meeting. `status` is `processing` while the summary is generated in the background, then `ready`, or `failed` with an `error_message` (retryable). `privacy` is one of six values (the Share modal offers five; Settings offers all six). | Index `(owner_id, meeting_date)` for the dashboard list; index on `status`; `duration_seconds >= 0` check. |
| `meeting_participants` | Many-to-many `meetings` ↔ `people` with a `role`. | Composite PK `(meeting_id, person_id)`; index on `person_id` for the reverse lookup. |
| `transcript_segments` | One speaker turn with `start_ms`/`end_ms`. | Index `(meeting_id, start_ms)` serves ordered reads and "segment at time t"; unique `(meeting_id, sequence_index)`; `end_ms >= start_ms` check. |
| `summaries` | AI-style overview, keyword list and timestamped `bullets` (`{label, text, start_ms}`). | One-to-one with `meetings` via unique FK. `generated_by` distinguishes seeded from LLM output. |
| `chapters` | Topic outline with a time range, a paragraph `summary` and timestamped `points` (`{text, start_ms}`). | Unique `(meeting_id, order_index)`. |
| `action_items` | Tasks from a meeting. | Optional assignee and optional link to the segment where it was said. Indexes on `(meeting_id, is_completed)` and `assignee_id`. |
| `user_settings` | One row of preferences per user (Settings page): default privacy for new meetings, auto-join, recap recipients, language, email notes, notify-on-ready, theme. | `user_id` is both PK and FK (1:1, cascade). Created with defaults by the seed and lazily if missing. |
| `meeting_shares` | Emails a meeting was shared with (Share modal). | Unique `(meeting_id, email)`; emails stored lower-cased. Recorded only: no email is sent and `meetings.privacy` is not enforced (auth is mocked). |
| `tags` / `meeting_tags` | Labels, many-to-many with meetings. | `tags.name` unique; composite PK on the link table. |
| `segment_highlights` | A user's highlight/comment on a segment (bonus feature). | Indexed on `segment_id` and `user_id`. |

## Delete behaviour

| Relationship | `ON DELETE` | Why |
| --- | --- | --- |
| everything hanging off `meetings` (participants, segments, summary, chapters, action items, shares, meeting tags) | `CASCADE` | A meeting owns its content. |
| `segment_highlights.segment_id` / `.user_id` | `CASCADE` | Highlights are meaningless without either side. |
| `meetings.owner_id` | `CASCADE` | Deleting a user removes their meetings. |
| `action_items.assignee_id`, `action_items.source_segment_id` | `SET NULL` | The task survives losing its assignee or source moment. |
| `transcript_segments.speaker_id` | `RESTRICT` | A person who spoke in a transcript can't be deleted from under it. |

Relationships also set `passive_deletes=True`, so the database performs cascades rather than loading children.

## Search

`transcript_fts` is an FTS5 external-content table (`porter unicode61` tokenizer) over `transcript_segments.text`,
kept in sync by `AFTER INSERT/DELETE/UPDATE` triggers (`backend/app/models/fts.py`). Query it by joining on
`rowid = transcript_segments.id`, e.g.:

```sql
SELECT s.meeting_id, s.start_ms, snippet(transcript_fts, 0, '<mark>', '</mark>', '…', 12)
FROM transcript_fts JOIN transcript_segments s ON s.id = transcript_fts.rowid
WHERE transcript_fts MATCH 'runway' ORDER BY rank;
```

## Seed data

`python -m app.seed.seed` (from `backend/`) drops and recreates everything: 1 user, 13 people, 10 tags, 8 meetings.
Meeting lengths vary: a meeting may set `target_minutes`, which rescales its computed timeline (so the seed has meetings under 15, 15-30 and over 30 minutes for the duration filter). Content is JSON in `backend/app/seed/data/` (`people.json`, `meetings/*.json`). Timestamps are computed from
text length, so segments never overlap and chapters/action items line up with the transcript.

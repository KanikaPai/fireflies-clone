# Progress

## Project Goal
A Fireflies.ai-style meeting assistant clone: browse meetings on a dashboard, open a meeting to see a synced transcript and audio/video player, and review AI-style summaries, action items and chapters. Users can create meetings and manage settings. Built as a full-stack SDE assignment with a Next.js frontend and a FastAPI + SQLite backend.

## Tech Stack
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
- **Backend:** Python 3.11+, FastAPI, SQLAlchemy 2.0, Pydantic v2
- **Database:** SQLite
- **Repo:** monorepo (`frontend/`, `backend/`)

## Checklist
- [x] Phase 0: Setup
- [x] Phase 1: DB schema + seed
- [ ] Phase 2: Backend API
- [ ] Phase 3: Frontend shell + dashboard
- [ ] Phase 4: Meeting detail + transcript/player sync
- [ ] Phase 5: Summary/action items/chapters + modals + toasts
- [ ] Phase 6: Create meeting + settings/placeholders
- [ ] Phase 7: Bonus features
- [ ] Phase 8: Deployment
- [ ] Phase 9: README + final review

## Decisions Log
- 2026-10-07: Monorepo with `frontend/` and `backend/`; SQLite for zero-setup persistence.
- 2026-10-07: Backend config via `.env` (`DATABASE_URL`, `CORS_ORIGINS`); `.env.example` is committed, `.env` and `*.db` are not.

- 2026-10-07: **Schema creation via `Base.metadata.create_all` (no Alembic).** The schema is created on startup by `init_db()`. Alembic was skipped: the DB is SQLite, seeded and disposable, and migrations add setup cost without value at this stage. Revisit if the schema must evolve with persistent data.
- 2026-10-07: **FTS5 index `transcript_fts` over `transcript_segments.text`.** Global search must scan every transcript; `LIKE '%term%'` is a full table scan with no ranking or snippets. FTS5 gives tokenised, stemmed (porter) matching, BM25 ranking and `snippet()` highlighting. It is an external-content table (no duplicated text) kept in sync by insert/update/delete triggers, and the seed rebuilds it after bulk loading.
- 2026-10-07: `people` is separate from `users`: speakers are reused across meetings and mostly never log in. Foreign keys are enforced via a PRAGMA on every SQLite connection; cascade/SET NULL/RESTRICT choices are listed in `docs/DATABASE.md`.
- 2026-10-07: Seed content lives in JSON (`backend/app/seed/data/`); segment timestamps are computed in the seeder (1.6 words/sec plus 1.5-5s pauses), so they never overlap and chapters/action-item links stay aligned by construction. Chapters and action-item sources are declared inline in the transcript JSON rather than by index.
- 2026-10-07: `meetings.media_url` is null for all seed meetings (no real recordings); Phase 4 will need to simulate playback or add a sample audio file. Seeded meetings are 15-19 minutes (the transcripts are excerpts of that length, not 60-minute recordings).
- 2026-10-07: The API seeds automatically on startup when `users` is empty (needed for deployment); `python -m app.seed.seed` forces a reset.
- 2026-10-07: Datetimes are stored as UTC (timezone-aware in Python; SQLite returns them naive, so treat as UTC).

## Known Issues
- `segment_highlights` has no seed rows (feature is a Phase 7 bonus).

## Changelog
### 2026-10-07 (Phase 1)
- Added 10 typed SQLAlchemy models with FKs, cascades, check constraints and indexes; FTS5 index with sync triggers; `PRAGMA foreign_keys=ON` in `db.py`; `init_db()`.
- Added seeder (`python -m app.seed.seed`) and JSON seed data: 1 user, 13 people, 10 tags, 8 meetings (401 segments, 38 chapters, 35 action items). API seeds on first startup.
- Added `docs/DATABASE.md` (Mermaid ER diagram, table notes, delete behaviour, search).
- Verified: seed row counts, FK enforcement, cascade delete of all meeting children (and FTS rows), FTS queries, no segment overlap, idempotent startup.

### 2026-10-07
- Initialized repo, Next.js frontend and FastAPI backend skeleton (`/api/health`, CORS for `http://localhost:3000`).

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
- [x] Phase 2: Backend API
- [x] Phase 3: Frontend shell + dashboard
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

- 2026-10-07: **Layering:** routers are HTTP-only (parameters, status codes, response models); all logic is in `app/services`, all request/response shapes in `app/schemas`. Services raise `ServiceError` subclasses (400/404/409/422) which one exception handler turns into `{"detail": ...}`. `get_current_user` (`app/deps.py`) is the single seam for replacing mocked auth; every query is scoped to the owner.
- 2026-10-07: **Summaries:** one `Summarizer` interface with a deterministic heuristic generator (default) and an optional Claude generator (`ANTHROPIC_API_KEY`) that falls back to the heuristic on any error. Added `GeneratedBy.HEURISTIC` (`heuristic`) beside `seed`/`llm` so provenance is accurate; the column is a non-native enum, so no migration was needed. Regenerate refreshes summary and chapters but only creates action items when none exist, so user edits are never overwritten.
- 2026-10-07: **Search sanitisation:** user text is reduced to `\w+` tokens, each double-quoted, joined with explicit `AND`; the last token is `("t" OR "t"*)` for type-ahead because prefix queries bypass the porter stemmer. (Implicit AND before a parenthesised group is an FTS5 syntax error.) Snippets are escaped server-side with `<mark>` added, so they are safe for `innerHTML`.
- 2026-10-07: **Meetings without a transcript** are created as `processing` with no summary (placeholder for future async processing). PATCH takes `participant_ids`/`tag_ids` (ids from the people/tags lists) rather than names. Response datetimes are normalised to UTC with a `Z` suffix.
- 2026-10-07: JSON transcripts: seconds vs milliseconds is auto-detected (fractional → seconds; max ≥ 100000 or median segment length > 300 → ms). Uploads capped at 5 MB, UTF-8 only.

- 2026-10-07: **Phase 4 media player will be simulated and timer-driven** (0 to `duration_seconds`, with play/pause/seek/skip/speed) because `media_url` is null and real audio would not match the seeded transcripts. It must be built behind an interface (e.g. a `MediaPlayer` contract with `play/pause/seek/setRate/currentTime`) so a real `<audio>` element can replace it whenever `media_url` exists.
- 2026-10-07: **Frontend stack:** Next.js 16 with Cache Components enabled (project default), Tailwind v4, shadcn/ui on Radix (`radix-nova` style; the CLI default was Base UI, which I switched away from for familiarity), TanStack Query, sonner, lucide, date-fns. Types come from `openapi-typescript` (`npm run gen:api`), exposed through aliases in `src/lib/api/types.ts`, so no backend shapes are re-declared by hand.
- 2026-10-07: **Cache Components rules:** any client component reading `usePathname`/`useSearchParams` must sit inside `<Suspense>` or the dynamic route `/meetings/[id]` fails to prerender. The shell is split so only `ShellNav`, `Topbar` and the pages' filter components suspend, never the page content.
- 2026-10-07: **Design tokens** live in `globals.css` as CSS variables (light and dark defined; the toggle ships in Phase 7) and are mapped into Tailwind (`bg-brand`, `text-text-secondary`, ...). The only literal colours in components are data values (`people.avatar_color`). Fonts: Inter (UI) and Poppins (headings), loaded with `next/font`.
- 2026-10-07: **Library state is URL-only** (`view`, `q`, `participant`, `range`/`from`/`to`, `duration`, `sort`), parsed in `lib/meetingFilters.ts` and written by `useMeetingFilters`. The topbar search is bound to `q` with a 300 ms debounce on /meetings and jumps there on Enter elsewhere. Duration presets map to inclusive `min_duration`/`max_duration` seconds (Under 15 = max 899, 15-30 = 900-1800, Over 30 = min 1801).
- 2026-10-07: **Backend additions for the UI** (all with tests, documented in `docs/API.md`): `GET /api/action-items?completed=`, `min_duration`/`max_duration`/`status`/`platform` on `GET /api/meetings`, and `meeting_count`/`last_meeting_date` on `GET /api/people`. The seed now varies meeting length with an optional `target_minutes` (rescales the timeline), so the duration filter has data in every bucket (14, 16-22 and 31-34 minutes).
- 2026-10-07: Home feed bullets come from each meeting's chapters (title: summary), which requires fetching each meeting's detail (parallel `useQueries`, cached). Acceptable for a page of 20; a `summary`/`chapters` include on the list endpoint would remove the N requests if it ever matters.
- 2026-10-07: With one mocked user, "My Meetings" and "All Meetings" return the same data; "Shared With Me" is an empty state and "Voice Agent Meetings" is Coming Soon, per the brief.

- 2026-10-07: **Focus styling is keyboard-only.** `Providers` tracks input modality (`data-input="pointer|keyboard"` on `<html>`); after a pointer interaction no focus ring is drawn even where `:focus-visible` would match (Radix tabs/menus move focus programmatically). Keyboard focus is a 2px outline (shadcn components use a `ring-2` at 40% opacity) offset by 2px, so it never looks like the light-purple active state.

## Known Issues
- `segment_highlights` has no seed rows or API (feature is a Phase 7 bonus).
- The Claude summarizer path is covered by tests with a mocked model call only; it has not been exercised against the real API (no key available in this environment).
- **Local dev port / CORS:** `npm run dev` falls back to :3001 (or :3002) when :3000 is taken, and the API only allows the origins in `CORS_ORIGINS`. `backend/.env.example` now lists both :3000 and :3001; add the actual dev port to your `.env` if it differs, otherwise the browser reports a CORS error.
- **Visual differences from the screenshots (remaining):** the logo is an original approximation, not the real mark; fonts are Inter/Poppins stand-ins for Fireflies' typefaces; organizer avatars show the host's initial where the reference shows the Fireflies logo for uploads and bot-recorded meetings; the old-UI chrome (trial banner, "Get AI Credits", referral card, floating "Get Started" chat bubble and help button) is intentionally omitted; the Playlist preview card and Home feed bullet icons are simplified; the calendar popover uses default shadcn styling; row heights/spacing were matched by eye (the screenshots are zoomed crops), not measured; dates render in the browser's timezone; the rail icon set (lucide) differs slightly from Fireflies' icons; there is an extra "Newest/Oldest" sort control and a view dropdown below `lg` (the panel is hidden on tablets) that the reference does not have.
- No frontend unit tests yet; behaviour was verified with a throwaway Playwright script (27 checks: every filter, sort, view, search, URL persistence, Load more, task persistence, no console errors) that is not committed.
- Heuristic action items are cue-based and can include low-value sentences (e.g. "I'll start on…"); chapter titles are keyword lists rather than natural phrases.

## Changelog
### 2026-10-07 (Phase 3 polish)
- Focus rings only for keyboard navigation (verified: clicking nav items/buttons leaves no outline, Tab shows a 2px ring); toast width 280-420px (one line for short messages); uploads hint keeps "5 MB" together on one line; Home feed/notetaker/topbar tightened at 1024px (nowrap week headers, icon-only Share Feedback below `xl`, narrower right column).
- Swept all pages at 1440px and 1024px with a wrap/overflow script: only natural paragraph wraps remain.

### 2026-10-07 (Phase 3)
- Frontend foundation: shadcn primitives, light/dark design tokens, typed API client + generated OpenAPI types, TanStack Query hooks with central keys, sonner toasts in the Fireflies dark style, reusable Modal/EmptyState/ErrorState/ComingSoon/Avatar components and formatters.
- App shell: white sidebar (3 groups, active purple state, icon rail below `lg` and on /meetings), NotebookPanel with channel search, topbar (search, Invite, Capture split button, mic, notifications popover, user menu from /api/me), mobile drawer.
- Routes: /home (My Feed, Tasks with optimistic checkboxes, AI Apps, right column), /meetings (library with URL-driven view/search/participant/date/duration/sort filters, week groups, selection + bulk bar, row menu, Load more, skeleton/empty/error states), /meetings/[id] placeholder, /meeting-status, /contacts, /uploads, /playlist, and Coming Soon pages for integrations, ai-apps, topic-tracker, analytics, team, upgrade, settings.
- Backend: action-item list endpoint, duration/status/platform filters, people stats (86 backend tests total).
- Verified: `npm run build` and `npm run lint` clean, all backend tests pass, Playwright run against the live API (27/27 checks).

### 2026-10-07 (Phase 2)
- Added the REST API (18 routes under `/api`): meetings CRUD + filters/pagination, transcript, create via paste and upload (.txt/.vtt/.json), action items CRUD, people, tags, FTS5 global search, summary regeneration, `/api/me`.
- Added `transcript_parser`, `summarizer` (heuristic + optional Claude), schemas, services, routers, `ANTHROPIC_API_KEY` in `.env.example`, sample transcripts.
- Added 81 pytest tests (temp SQLite, reseeded per test) and `docs/API.md`.
- Verified: all tests pass; curl checks of list, search, upload and delete; list endpoint runs a constant 6 queries regardless of page size; every route has a response model.

### 2026-10-07 (Phase 1)
- Added 10 typed SQLAlchemy models with FKs, cascades, check constraints and indexes; FTS5 index with sync triggers; `PRAGMA foreign_keys=ON` in `db.py`; `init_db()`.
- Added seeder (`python -m app.seed.seed`) and JSON seed data: 1 user, 13 people, 10 tags, 8 meetings (401 segments, 38 chapters, 35 action items). API seeds on first startup.
- Added `docs/DATABASE.md` (Mermaid ER diagram, table notes, delete behaviour, search).
- Verified: seed row counts, FK enforcement, cascade delete of all meeting children (and FTS rows), FTS queries, no segment overlap, idempotent startup.

### 2026-10-07
- Initialized repo, Next.js frontend and FastAPI backend skeleton (`/api/health`, CORS for `http://localhost:3000`).

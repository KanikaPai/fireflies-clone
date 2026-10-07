# Fireflies Clone — Standing Rules

These rules apply to every session in this repo.

## Workflow (after completing each task)
1. Update `PROGRESS.md`: tick checklist items, add a dated changelog entry, record decisions in the Decisions Log.
2. `git add -A`, commit with a clear conventional-commit message (`feat:`, `fix:`, `chore:`, `docs:`), then `git push`.
3. Commit in small logical units, never one giant commit at the end.
4. Never commit secrets or the `.db` file.

## Code quality
- Clean, typed, modular code (TypeScript on the frontend, type-hinted Python on the backend).
- Reusable React components; business logic lives in `backend/app/services`, not in routers.
- Write original code. Do not copy from existing Fireflies clone repositories.

## Verification
- Before saying a task is done, verify it actually runs: the build passes, the endpoint responds.

## Stack
- `frontend/`: Next.js (App Router, TypeScript, Tailwind CSS, `src/` dir)
- `backend/`: Python 3.11+, FastAPI, SQLAlchemy 2.0, Pydantic v2, SQLite

## Commands
- Frontend: `cd frontend && npm run dev` (port 3000) / `npm run build`
- Backend: `cd backend && source .venv/bin/activate && uvicorn app.main:app --reload` (port 8000)

## End of session
- Finish with a short summary: what was done, what's next, any issues.

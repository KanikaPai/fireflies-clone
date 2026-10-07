# Deployment (Render + Vercel)

Backend: Render free web service (Blueprint in `render.yaml`). Frontend: Vercel (root directory `frontend`).

## 1. Backend on Render
1. Push the repo to GitHub. On https://render.com sign in with GitHub.
2. **New → Blueprint**, pick this repo, branch `main`. Render reads `render.yaml` and creates `fireflies-api` (free plan, root `backend`).
3. Apply. Wait for the deploy to go live; note the URL `https://fireflies-api-XXXX.onrender.com`.
4. Check `https://<render-url>/api/health` returns `{"status":"ok"...}` and `/docs` loads.
5. After the frontend exists, set `CORS_ORIGINS` (service → Environment) to the Vercel URL, e.g. `https://my-app.vercel.app` (no trailing slash; comma-separate several). The service redeploys.

| Variable | Value |
| --- | --- |
| `PYTHON_VERSION` | `3.12.5` |
| `PROCESSING_DELAY_SECONDS` | `4` |
| `CORS_ORIGINS` | your Vercel URL |
| `CORS_ORIGIN_REGEX` | `https://.*\.vercel\.app` (allows Vercel preview URLs; optional) |
| `ANTHROPIC_API_KEY` | optional; omit to use the built-in heuristic summarizer |

The start command is `uvicorn app.main:app --host 0.0.0.0 --port $PORT` (single worker; processing runs in-process).

## 2. Frontend on Vercel
1. On https://vercel.com sign in with GitHub → **Add New → Project** → import the repo.
2. **Root Directory: `frontend`** (Framework preset: Next.js, default build settings).
3. Environment variable: `NEXT_PUBLIC_API_URL` = the Render URL (no trailing slash).
4. Deploy, then put the resulting Vercel URL into Render's `CORS_ORIGINS` (step 1.5).

`frontend/src/lib/api/schema.d.ts` is committed, so the build never needs a running backend. Regenerate it locally after API changes.

## Free-tier caveats
- Render free instances sleep after ~15 min idle; the first request takes ~30-60 s. The UI shows a "Waking up the demo server" banner and retries failed requests 3 times with backoff.
- The disk is ephemeral: SQLite is recreated and reseeded on every boot, so demo data resets on restart. If an existing DB file has an outdated schema, it is dropped and reseeded at startup instead of crashing.

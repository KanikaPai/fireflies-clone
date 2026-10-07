import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.db import init_db
from app.routers import (
    action_items,
    askfred,
    highlights,
    meetings,
    meta,
    people,
    search,
    segments,
    shares,
    tags,
    transcripts,
)
from app.seed.seed import seed_if_empty
from app.services import processing
from app.services.errors import ServiceError

load_dotenv()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    init_db()
    seed_if_empty()
    processing.recover_stuck(processing.run_in_thread)  # resume work lost to a restart
    yield


app = FastAPI(
    title="Fireflies Clone API",
    version="0.2.0",
    description="Meeting transcripts, summaries and action items.",
    lifespan=lifespan,
)

origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
# Optional regex (e.g. https://.*\.vercel\.app) so Vercel preview URLs work too.
origin_regex = os.getenv("CORS_ORIGIN_REGEX", "").strip() or None
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],  # lets the browser read the export filename
)


@app.exception_handler(ServiceError)
async def service_error_handler(_: Request, exc: ServiceError) -> JSONResponse:
    """Map domain errors to the standard {"detail": ...} error body."""
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)


for router in (
    meta.router,
    meetings.router,
    highlights.router,
    askfred.router,
    shares.router,
    segments.router,
    transcripts.router,
    action_items.router,
    people.router,
    tags.router,
    search.router,
):
    app.include_router(router)

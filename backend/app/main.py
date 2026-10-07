import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.db import init_db
from app.routers import action_items, meetings, meta, people, search, segments, shares, tags, transcripts
from app.seed.seed import seed_if_empty
from app.services.errors import ServiceError

load_dotenv()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    init_db()
    seed_if_empty()
    yield


app = FastAPI(
    title="Fireflies Clone API",
    version="0.2.0",
    description="Meeting transcripts, summaries and action items.",
    lifespan=lifespan,
)

origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ServiceError)
async def service_error_handler(_: Request, exc: ServiceError) -> JSONResponse:
    """Map domain errors to the standard {"detail": ...} error body."""
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)


for router in (
    meta.router,
    meetings.router,
    shares.router,
    segments.router,
    transcripts.router,
    action_items.router,
    people.router,
    tags.router,
    search.router,
):
    app.include_router(router)

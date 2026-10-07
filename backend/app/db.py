import logging
import os
from collections.abc import Iterator
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, event, inspect
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

load_dotenv()

logger = logging.getLogger(__name__)

# Default DB lives next to the code (backend/fireflies.db), not in the process working directory.
BACKEND_DIR = Path(__file__).resolve().parent.parent
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BACKEND_DIR / 'fireflies.db'}")

# check_same_thread=False is required for SQLite when used across FastAPI threads.
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@event.listens_for(Engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, _record) -> None:  # type: ignore[no-untyped-def]
    """SQLite ignores FOREIGN KEY constraints (and ON DELETE CASCADE) unless this is set per connection."""
    if DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def get_db() -> Iterator[Session]:
    """FastAPI dependency yielding a request-scoped DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _schema_matches_models() -> bool:
    """True when every model table and column exists in the connected database."""
    inspector = inspect(engine)
    existing = set(inspector.get_table_names())
    for table in Base.metadata.sorted_tables:
        if table.name not in existing:
            return False
        columns = {c["name"] for c in inspector.get_columns(table.name)}
        if not {c.name for c in table.columns} <= columns:
            return False
    return True


def _reset_stale_sqlite_file() -> None:
    """Delete an on-disk SQLite file whose schema is older than the models (it is recreated and reseeded).

    Demo data is disposable (ephemeral hosting disk), so this is safer than crashing on a missing column.
    """
    path = engine.url.database
    if not DATABASE_URL.startswith("sqlite") or not path or path == ":memory:" or not Path(path).exists():
        return
    if not inspect(engine).get_table_names() or _schema_matches_models():
        return  # empty file or up to date: create_all handles it
    logger.warning("Database schema does not match the models; recreating %s", path)
    engine.dispose()
    for suffix in ("", "-wal", "-shm", "-journal"):
        Path(path + suffix).unlink(missing_ok=True)


def init_db() -> None:
    """Create all tables and the FTS5 search index (idempotent; recreates a stale SQLite file)."""
    from app import models  # noqa: F401  (registers models on Base.metadata)
    from app.models.fts import create_fts

    _reset_stale_sqlite_file()
    Base.metadata.create_all(engine)
    if DATABASE_URL.startswith("sqlite"):
        with engine.begin() as conn:
            create_fts(conn)

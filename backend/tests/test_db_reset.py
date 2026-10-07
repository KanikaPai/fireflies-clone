import sqlite3
from pathlib import Path

from app import db


def test_stale_sqlite_file_is_recreated(tmp_path: Path, monkeypatch) -> None:
    path = tmp_path / "stale.db"
    conn = sqlite3.connect(path)
    conn.execute("CREATE TABLE users (id INTEGER PRIMARY KEY)")  # missing columns and tables
    conn.commit()
    conn.close()

    from sqlalchemy import create_engine

    engine = create_engine(f"sqlite:///{path}")
    monkeypatch.setattr(db, "engine", engine)
    monkeypatch.setattr(db, "DATABASE_URL", f"sqlite:///{path}")
    db.init_db()
    assert db._schema_matches_models()
    engine.dispose()

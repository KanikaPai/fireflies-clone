"""SQLite FTS5 full-text index over transcript_segments.text.

Uses an external-content table (no duplicated text storage); triggers keep it in sync with
inserts, updates and deletes (including meeting-level cascade deletes).
"""

from sqlalchemy import text
from sqlalchemy.engine import Connection

FTS_TABLE = "transcript_fts"

_STATEMENTS = [
    f"""CREATE VIRTUAL TABLE IF NOT EXISTS {FTS_TABLE} USING fts5(
        text, content='transcript_segments', content_rowid='id',
        tokenize='porter unicode61'
    )""",
    f"""CREATE TRIGGER IF NOT EXISTS transcript_fts_ai AFTER INSERT ON transcript_segments BEGIN
        INSERT INTO {FTS_TABLE}(rowid, text) VALUES (new.id, new.text);
    END""",
    f"""CREATE TRIGGER IF NOT EXISTS transcript_fts_ad AFTER DELETE ON transcript_segments BEGIN
        INSERT INTO {FTS_TABLE}({FTS_TABLE}, rowid, text) VALUES ('delete', old.id, old.text);
    END""",
    f"""CREATE TRIGGER IF NOT EXISTS transcript_fts_au AFTER UPDATE OF text ON transcript_segments BEGIN
        INSERT INTO {FTS_TABLE}({FTS_TABLE}, rowid, text) VALUES ('delete', old.id, old.text);
        INSERT INTO {FTS_TABLE}(rowid, text) VALUES (new.id, new.text);
    END""",
]


def create_fts(conn: Connection) -> None:
    for stmt in _STATEMENTS:
        conn.execute(text(stmt))


def drop_fts(conn: Connection) -> None:
    for trigger in ("ai", "ad", "au"):
        conn.execute(text(f"DROP TRIGGER IF EXISTS transcript_fts_{trigger}"))
    conn.execute(text(f"DROP TABLE IF EXISTS {FTS_TABLE}"))


def rebuild_fts(conn: Connection) -> None:
    conn.execute(text(f"INSERT INTO {FTS_TABLE}({FTS_TABLE}) VALUES ('rebuild')"))

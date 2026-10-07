import os
import tempfile
from pathlib import Path

# Must be set before app.db is imported: the engine is created at import time.
_TMP_DIR = tempfile.mkdtemp(prefix="fireflies-tests-")
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_TMP_DIR) / 'test.db'}"
os.environ.pop("ANTHROPIC_API_KEY", None)
os.environ["PROCESSING_DELAY_SECONDS"] = "0"  # processing is instant in tests
os.environ.pop("PROCESSING_FAIL_PATTERN", None)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.seed.seed import reset_and_seed  # noqa: E402

SAMPLES = Path(__file__).resolve().parent.parent / "sample_transcripts"


@pytest.fixture(autouse=True)
def _no_llm(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)


@pytest.fixture()
def client() -> TestClient:
    """A client against a freshly seeded temporary SQLite database (no lifespan: we seed explicitly)."""
    reset_and_seed()
    return TestClient(app)


@pytest.fixture()
def sample() -> "callable":
    return lambda name: (SAMPLES / name).read_bytes()


def final(client: TestClient, response):  # type: ignore[no-untyped-def]
    """The meeting after background processing finished (delay is 0 and TestClient runs background tasks)."""
    return client.get(f"/api/meetings/{response.json()['id']}").json()

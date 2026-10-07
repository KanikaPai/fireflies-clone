"""Background processing of a meeting's transcript: generate summary, chapters and action items.

A meeting with a transcript is saved as ``processing`` and handed to ``process_meeting`` (a FastAPI
BackgroundTask with its own DB session). It ends as ``ready``, or ``failed`` with an ``error_message``.
``PROCESSING_DELAY_SECONDS`` (default 4) simulates real processing time so the flow is visible in the UI;
tests set it to 0.
"""

import logging
import os
import threading
import time
from collections.abc import Callable

from sqlalchemy import select

from app.db import SessionLocal
from app.models import Meeting, MeetingStatus, TranscriptSegment
from app.models.mixins import utcnow
from app.services import meeting_analysis

log = logging.getLogger(__name__)

DEFAULT_DELAY_SECONDS = 4.0
MAX_ERROR_LENGTH = 500


def processing_delay() -> float:
    """Read at call time so tests and deployments can change it without re-importing."""
    try:
        return max(0.0, float(os.getenv("PROCESSING_DELAY_SECONDS", DEFAULT_DELAY_SECONDS)))
    except ValueError:
        return DEFAULT_DELAY_SECONDS


def _simulated_failure(meeting: Meeting) -> None:
    """Demo/test hook: PROCESSING_FAIL_PATTERN=<text> makes meetings whose title contains it fail.
    Renaming the meeting and pressing Retry then succeeds, which shows the whole failed -> retry path."""
    pattern = os.getenv("PROCESSING_FAIL_PATTERN", "").strip().lower()
    if pattern and pattern in meeting.title.lower():
        raise RuntimeError(f"Simulated processing failure (title contains “{pattern}”).")


def process_meeting(meeting_id: int) -> None:
    """Run processing for one meeting. Safe to call twice: it only acts on meetings still ``processing``."""
    delay = processing_delay()
    if delay:
        time.sleep(delay)
    with SessionLocal() as db:
        meeting = db.get(Meeting, meeting_id)
        if meeting is None or meeting.status != MeetingStatus.PROCESSING:
            return
        try:
            _simulated_failure(meeting)
            meeting_analysis.generate_and_store(db, meeting)
            meeting.status, meeting.error_message = MeetingStatus.READY, None
            meeting.processed_at = meeting.updated_at = utcnow()
            db.commit()
        except Exception as exc:  # noqa: BLE001 - any failure must end in a visible "failed" state, never a stuck one
            db.rollback()
            log.warning("Processing meeting %s failed: %s", meeting_id, exc)
            meeting = db.get(Meeting, meeting_id)
            if meeting is not None:
                meeting.status = MeetingStatus.FAILED
                meeting.error_message = (str(exc) or exc.__class__.__name__)[:MAX_ERROR_LENGTH]
                meeting.processed_at = meeting.updated_at = utcnow()
                db.commit()


def recover_stuck(schedule: Callable[[int], None]) -> list[int]:
    """Re-queue meetings left in ``processing`` (e.g. the server restarted mid-task).

    A processing meeting with no transcript has nothing to process, so it is simply marked ready.
    Returns the ids that were scheduled.
    """
    with SessionLocal() as db:
        with_segments = select(TranscriptSegment.meeting_id).group_by(TranscriptSegment.meeting_id)
        stuck = db.scalars(select(Meeting).where(Meeting.status == MeetingStatus.PROCESSING)).all()
        has_transcript = set(db.scalars(with_segments))
        ids = [m.id for m in stuck if m.id in has_transcript]
        for meeting in stuck:
            if meeting.id not in has_transcript:
                meeting.status = MeetingStatus.READY
        db.commit()
    for meeting_id in ids:
        schedule(meeting_id)
    return ids


def run_in_thread(meeting_id: int) -> None:
    """Scheduler used at startup, where no request (and so no BackgroundTasks) exists."""
    threading.Thread(target=process_meeting, args=(meeting_id,), daemon=True, name=f"process-{meeting_id}").start()

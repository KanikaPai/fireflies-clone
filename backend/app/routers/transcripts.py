from fastapi import APIRouter, Request
from starlette.datastructures import UploadFile

from app.deps import DbSession
from app.schemas.intake import ParsePreview, ParseTextRequest
from app.services import transcript_intake
from app.services.errors import UnprocessableError
from app.services.transcript_intake import MAX_UPLOAD_BYTES

router = APIRouter(prefix="/api/transcripts", tags=["transcripts"])


async def read_transcript_request(request: Request) -> tuple[str, str]:
    """(format, text) from a multipart `file` field or a JSON `{text}` body (shared by parse and attach)."""
    content_type = request.headers.get("content-type", "")
    if content_type.startswith("multipart/form-data"):
        form = await request.form()
        upload = form.get("file")
        if not isinstance(upload, UploadFile):
            raise UnprocessableError("Send the transcript as a 'file' field.")
        content = await upload.read(MAX_UPLOAD_BYTES + 1)  # one extra byte so oversize files are detected
        return transcript_intake.read_upload(upload.filename or "", content)
    if content_type.startswith("application/json"):
        try:
            body = ParseTextRequest.model_validate(await request.json())
        except ValueError as exc:
            raise UnprocessableError("Send JSON like {\"text\": \"...\"}.") from exc
        return transcript_intake.read_pasted(body.text)
    raise UnprocessableError("Send a multipart 'file' upload or a JSON body with 'text'.")


@router.post(
    "/parse",
    response_model=ParsePreview,
    summary="Dry-run parse of a transcript (nothing is saved)",
    description="Accepts a multipart `file` (.txt/.vtt/.json, max 5 MB) or JSON `{\"text\": ...}`. Returns the detected "
    "format, segment count, duration, speakers (with matches to existing people), the first segments and warnings. "
    "415 unsupported extension, 413 too large, 422 empty or unparseable.",
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {
                "multipart/form-data": {
                    "schema": {"type": "object", "properties": {"file": {"type": "string", "format": "binary"}}, "required": ["file"]}
                },
                "application/json": {"schema": {"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"]}},
            },
        }
    },
)
async def parse_transcript_preview(request: Request, db: DbSession) -> ParsePreview:
    fmt, text = await read_transcript_request(request)
    return transcript_intake.preview(db, fmt, text)

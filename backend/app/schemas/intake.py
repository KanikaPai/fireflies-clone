from pydantic import BaseModel, Field


class ParseTextRequest(BaseModel):
    text: str = Field(description="Pasted transcript (.txt, .vtt or .json content)")


class SpeakerPreview(BaseModel):
    name: str
    matched_person_id: int | None  # an existing person with this name (case-insensitive), else null


class SegmentPreview(BaseModel):
    speaker: str
    start_ms: int
    end_ms: int
    text: str


class ParsePreview(BaseModel):
    format_detected: str
    segment_count: int
    duration_seconds: int
    speakers: list[SpeakerPreview]
    preview: list[SegmentPreview]
    warnings: list[str]

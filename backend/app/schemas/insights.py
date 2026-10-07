from pydantic import BaseModel

from app.schemas.person import PersonBrief


class SpeakerInsight(BaseModel):
    person: PersonBrief
    talk_time_ms: int
    talk_time_pct: int  # whole percent of all talk time; the list always sums to 100
    wpm: int  # words per minute while speaking
    segment_count: int


class FilterCategory(BaseModel):
    key: str  # questions | tasks | metrics | date_time | pricing
    label: str
    count: int
    segment_ids: list[int]


class SegmentSentiment(BaseModel):
    segment_id: int
    label: str  # positive | neutral | negative
    score: int


class SentimentSummary(BaseModel):
    positive_pct: int
    neutral_pct: int
    negative_pct: int
    by_segment: list[SegmentSentiment]


class MeetingInsights(BaseModel):
    speakers: list[SpeakerInsight]
    filters: list[FilterCategory]
    sentiment: SentimentSummary

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class AnalysisStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ErrorDetail(BaseModel):
    code: str
    message: str
    field: str | None = None


class MixUploadResponse(BaseModel):
    mix_id: UUID
    filename: str
    content_type: str | None
    size_bytes: int
    message: str = "File stored. Call POST /analyze-mix to queue analysis."


class AnalyzeMixRequest(BaseModel):
    mix_id: UUID


class AnalyzeMixResponse(BaseModel):
    mix_id: UUID
    status: AnalysisStatus
    message: str = "Queued; worker will process and update status."


class MixStatusResponse(BaseModel):
    """Minimal poll payload, e.g. `{ "status": "processing" }`."""

    status: AnalysisStatus


class MixOutcomeResponse(BaseModel):
    """
    Unified poll shape: `{ "status": "…", "result": … }`.
    `result` is set when `completed` or `failed`; omitted/null while `pending`/`processing`.
    """

    status: AnalysisStatus
    result: dict[str, Any] | None = None


class TrackMatch(BaseModel):
    track_id: str | None = None
    title: str | None = None
    artist: str | None = None
    confidence: float = Field(ge=0.0, le=1.0)
    segment_start_sec: float | None = None
    segment_end_sec: float | None = None


class MixReport(BaseModel):
    mix_id: UUID
    filename: str | None = None
    status: AnalysisStatus
    created_at: datetime | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    summary: dict[str, Any] = Field(default_factory=dict)
    matches: list[TrackMatch] = Field(default_factory=list)
    error: ErrorDetail | None = None

    @field_validator("summary", mode="before")
    @classmethod
    def default_summary(cls, v: Any) -> dict[str, Any]:
        return v if isinstance(v, dict) else {}


class HealthResponse(BaseModel):
    status: str = "ok"

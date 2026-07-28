from __future__ import annotations

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from fastapi import FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.claim_prediction import ClaimPredictionInput, ClaimPredictionJSON, predict_claim_outcome
from app.config import settings
from app.models import (
    AnalysisStatus,
    AnalyzeMixRequest,
    AnalyzeMixResponse,
    ErrorDetail,
    HealthResponse,
    MixOutcomeResponse,
    MixStatusResponse,
    MixUploadResponse,
)
from app.mix_status_store import close_mix_status_redis, get_mix_status, init_mix_status_redis, set_mix_status
from app.state import MixRecord, registry
from app.storage import UploadTooLargeError, write_bytes_to_path
from worker import analyze_mix_task

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)


def _iso_utc(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    return dt.isoformat()


def _record_to_outcome(rec: MixRecord) -> MixOutcomeResponse:
    st = rec.status
    if st in (AnalysisStatus.PENDING, AnalysisStatus.PROCESSING):
        return MixOutcomeResponse(status=st, result=None)
    if st == AnalysisStatus.FAILED:
        return MixOutcomeResponse(
            status=st,
            result={
                "mix_id": str(rec.mix_id),
                "filename": rec.filename,
                "error": rec.error.model_dump() if rec.error else None,
            },
        )
    return MixOutcomeResponse(
        status=st,
        result={
            "mix_id": str(rec.mix_id),
            "filename": rec.filename,
            "summary": rec.summary,
            "matches": [m.model_dump() for m in rec.matches],
            "created_at": _iso_utc(rec.created_at),
            "started_at": _iso_utc(rec.started_at),
            "completed_at": _iso_utc(rec.completed_at),
        },
    )


def _error_body(code: str, message: str, field: str | None = None) -> dict[str, Any]:
    detail = ErrorDetail(code=code, message=message, field=field)
    return {"error": detail.model_dump()}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Mix analysis runs in Celery (`worker.analyze_mix_task`); Redis holds `/mix-report` status."""
    await init_mix_status_redis()
    try:
        yield
    finally:
        await close_mix_status_redis()


app = FastAPI(
    title="DJ Mix Copyright Analyzer API",
    version="0.1.0",
    lifespan=lifespan,
)

_cors_origins = [
    o.strip()
    for o in os.environ.get(
        "CORS_ALLOW_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(UploadTooLargeError)
async def upload_too_large_handler(request: Request, exc: UploadTooLargeError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        content=_error_body(
            "PAYLOAD_TOO_LARGE",
            f"Upload exceeds maximum size of {exc.max_bytes} bytes.",
            field="file",
        ),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed.",
                "details": exc.errors(),
            }
        },
    )


@app.get("/health", response_model=HealthResponse, tags=["meta"])
async def health() -> HealthResponse:
    return HealthResponse()


@app.post(
    "/predict-claim",
    response_model=ClaimPredictionJSON,
    tags=["prediction"],
)
async def predict_claim(body: ClaimPredictionInput) -> ClaimPredictionJSON:
    """Multinomial log-reg on label + artist (TF-IDF) + prior claim count → outcome probabilities."""
    return await asyncio.to_thread(predict_claim_outcome, body)


@app.post(
    "/upload-mix",
    response_model=MixUploadResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["mixes"],
)
async def upload_mix(file: UploadFile = File(..., description="DJ mix audio file (e.g. MP3)")) -> MixUploadResponse:
    if not file.filename or not file.filename.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_error_body("NO_FILENAME", "A filename is required.", "file"),
        )

    suffix = Path(file.filename).suffix.lower()
    if suffix not in settings.allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=_error_body(
                "UNSUPPORTED_TYPE",
                f"Allowed extensions: {', '.join(sorted(settings.allowed_extensions))}.",
                "file",
            ),
        )

    mix_id = uuid4()
    file_path = settings.upload_dir / f"{mix_id}.mp3"

    try:
        body = await file.read()
        if not body:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=_error_body("EMPTY_FILE", "Uploaded file is empty.", "file"),
            )
        if len(body) > settings.max_upload_bytes:
            raise UploadTooLargeError(settings.max_upload_bytes)
        await asyncio.to_thread(write_bytes_to_path, file_path, body)
        size_bytes = len(body)
    finally:
        await file.close()

    rec = await registry.add(
        mix_id=mix_id,
        filename=file.filename,
        stored_path=file_path,
        content_type=file.content_type,
        size_bytes=size_bytes,
    )

    return MixUploadResponse(
        mix_id=rec.mix_id,
        filename=file.filename,
        content_type=file.content_type,
        size_bytes=size_bytes,
    )


async def _enqueue_mix_analysis(mix_id: UUID) -> None:
    """Validate, mark queued in registry, send Celery task (`worker.analyze_mix_task`)."""
    rec = await registry.get(mix_id)
    if rec is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=_error_body("MIX_NOT_FOUND", "No mix exists for this id.", "mix_id"),
        )

    if rec.status == AnalysisStatus.PENDING and rec.analysis_requested:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=_error_body("ALREADY_PENDING", "Analysis is already pending for this mix.", "mix_id"),
        )
    if rec.status == AnalysisStatus.PROCESSING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=_error_body("IN_PROGRESS", "Analysis is already running for this mix.", "mix_id"),
        )
    if rec.status == AnalysisStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=_error_body("ALREADY_COMPLETED", "Analysis already finished; upload a new mix to re-run.", "mix_id"),
        )

    updated = await registry.mark_queued(mix_id)
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=_error_body("MIX_NOT_FOUND", "No mix exists for this id.", "mix_id"),
        )

    await set_mix_status(str(mix_id), "queued")
    analyze_mix_task.delay(str(mix_id))


@app.post("/analyze-mix/{mix_id}", tags=["mixes"])
async def analyze_mix(mix_id: str) -> dict[str, str]:
    """Queues Celery task; poll `GET /mix-report/{mix_id}` (`queued` → `processing` → `completed`)."""
    await set_mix_status(mix_id, "queued")
    analyze_mix_task.delay(mix_id)
    return {"status": "queued"}


@app.post("/analyze-mix", response_model=AnalyzeMixResponse, tags=["mixes"])
async def analyze_mix_json(body: AnalyzeMixRequest) -> AnalyzeMixResponse:
    """JSON body `{ mix_id }`; validates registry and marks queued before Celery."""
    await _enqueue_mix_analysis(body.mix_id)
    return AnalyzeMixResponse(mix_id=body.mix_id, status=AnalysisStatus.PENDING)


@app.get("/mix-report/{mix_id}", tags=["mixes"])
async def get_report(mix_id: str) -> dict[str, str]:
    st = await get_mix_status(mix_id)
    return {"status": st}


@app.get("/mix-status/{mix_id}", response_model=MixStatusResponse, tags=["mixes"])
async def mix_status_registry(mix_id: UUID) -> MixStatusResponse:
    """Registry-based status (enum). For Redis-backed Celery progress, use `GET /mix-report/{mix_id}`."""
    rec = await registry.get(mix_id)
    if rec is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=_error_body("MIX_NOT_FOUND", "No mix exists for this id.", "mix_id"),
        )
    return MixStatusResponse(status=rec.status)


@app.get("/mix-outcome/{mix_id}", response_model=MixOutcomeResponse, tags=["mixes"])
async def mix_outcome(mix_id: UUID) -> MixOutcomeResponse:
    """
    `{ "status": "completed", "result": { "summary", "matches", … } }` when done;
    `{ "status": "pending" | "processing", "result": null }` while running.
    """
    rec = await registry.get(mix_id)
    if rec is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=_error_body("MIX_NOT_FOUND", "No mix exists for this id.", "mix_id"),
        )
    return _record_to_outcome(rec)


# FastAPI stores HTTPException.detail as-is; normalize dict details in a middleware-free way via override:

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict):
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_body("HTTP_ERROR", str(exc.detail)),
    )

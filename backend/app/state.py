"""
In-process mix registry and asyncio job queue.
Swap for Redis/RQ/Celery when you need multiple API instances.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

from app.models import AnalysisStatus, ErrorDetail, MixReport, TrackMatch


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class MixRecord:
    mix_id: UUID
    filename: str
    stored_path: Path
    content_type: str | None
    size_bytes: int
    status: AnalysisStatus
    # True after POST /analyze-mix accepted; status stays pending until worker runs.
    analysis_requested: bool = False
    created_at: datetime = field(default_factory=_utcnow)
    started_at: datetime | None = None
    completed_at: datetime | None = None
    summary: dict = field(default_factory=dict)
    matches: list[TrackMatch] = field(default_factory=list)
    error: ErrorDetail | None = None


class MixRegistry:
    def __init__(self) -> None:
        self._mixes: dict[UUID, MixRecord] = {}
        self._lock = asyncio.Lock()

    async def add(
        self,
        *,
        mix_id: UUID,
        filename: str,
        stored_path: Path,
        content_type: str | None,
        size_bytes: int,
    ) -> MixRecord:
        rec = MixRecord(
            mix_id=mix_id,
            filename=filename,
            stored_path=stored_path,
            content_type=content_type,
            size_bytes=size_bytes,
            status=AnalysisStatus.PENDING,
            analysis_requested=False,
        )
        async with self._lock:
            self._mixes[mix_id] = rec
        return rec

    async def get(self, mix_id: UUID) -> MixRecord | None:
        async with self._lock:
            return self._mixes.get(mix_id)

    async def mark_queued(self, mix_id: UUID) -> MixRecord | None:
        async with self._lock:
            rec = self._mixes.get(mix_id)
            if rec is None:
                return None
            if rec.status not in (AnalysisStatus.PENDING, AnalysisStatus.FAILED):
                return rec
            if rec.status == AnalysisStatus.PENDING and rec.analysis_requested:
                return rec
            rec.status = AnalysisStatus.PENDING
            rec.analysis_requested = True
            return rec

    async def mark_processing(self, mix_id: UUID) -> None:
        async with self._lock:
            rec = self._mixes.get(mix_id)
            if rec:
                rec.status = AnalysisStatus.PROCESSING
                rec.started_at = _utcnow()

    async def mark_completed(
        self,
        mix_id: UUID,
        *,
        summary: dict,
        matches: list[TrackMatch],
    ) -> None:
        async with self._lock:
            rec = self._mixes.get(mix_id)
            if rec:
                rec.status = AnalysisStatus.COMPLETED
                rec.completed_at = _utcnow()
                rec.summary = summary
                rec.matches = matches
                rec.error = None

    async def mark_failed(self, mix_id: UUID, error: ErrorDetail) -> None:
        async with self._lock:
            rec = self._mixes.get(mix_id)
            if rec:
                rec.status = AnalysisStatus.FAILED
                rec.analysis_requested = False
                rec.completed_at = _utcnow()
                rec.error = error
                rec.summary = {}
                rec.matches = []


class AnalysisJobQueue:
    def __init__(self) -> None:
        self._queue: asyncio.Queue[UUID] = asyncio.Queue()

    @property
    def queue(self) -> asyncio.Queue[UUID]:
        return self._queue

    async def enqueue(self, mix_id: UUID) -> None:
        await self._queue.put(mix_id)


registry = MixRegistry()
job_queue = AnalysisJobQueue()

from __future__ import annotations

import asyncio
import logging
from uuid import UUID

from app.chromaprint_service import detect_tracks_in_audio, get_analysis_catalog
from app.models import ErrorDetail, TrackMatch
from app.state import registry, job_queue

log = logging.getLogger(__name__)


async def run_analysis_pipeline(mix_id: UUID) -> None:
    await registry.mark_processing(mix_id)
    rec = await registry.get(mix_id)
    if rec is None:
        return

    try:
        if not rec.stored_path.exists():
            await registry.mark_failed(
                mix_id,
                ErrorDetail(
                    code="FILE_MISSING",
                    message="Uploaded file is no longer on disk.",
                ),
            )
            return

        catalog = get_analysis_catalog()
        try:
            detected = await asyncio.to_thread(
                detect_tracks_in_audio,
                rec.stored_path,
                catalog,
            )
        except Exception as e:
            log.exception("Chromaprint pipeline failed")
            await registry.mark_failed(
                mix_id,
                ErrorDetail(
                    code="ANALYSIS_ERROR",
                    message=str(e) or "Fingerprint pipeline failed",
                ),
            )
            return

        distinct = len({d.track_id for d in detected})
        await registry.mark_completed(
            mix_id,
            summary={
                "predicted_youtube_risk": "unknown" if not detected else "likely_claim",
                "risk_confidence": 0.0 if not detected else min(0.95, 0.4 + 0.05 * distinct),
                "distinct_tracks_estimate": distinct,
                "catalog_size": len(catalog),
                "notes": "Chromaprint segment match; tune threshold and catalog for production.",
            },
            matches=[
                TrackMatch(
                    track_id=d.track_id,
                    title=d.title,
                    artist=d.artist,
                    confidence=d.confidence,
                    segment_start_sec=d.start_sec,
                    segment_end_sec=d.end_sec,
                )
                for d in detected
            ],
        )
    except asyncio.CancelledError:
        raise
    except Exception as e:
        log.exception("Analysis failed for mix_id=%s", mix_id)
        await registry.mark_failed(
            mix_id,
            ErrorDetail(
                code="ANALYSIS_ERROR",
                message=str(e) or "Unknown analysis error",
            ),
        )


async def worker_loop() -> None:
    """Dequeue mix IDs, run fingerprinting, then mark completed/failed on the registry."""
    q = job_queue.queue
    while True:
        mix_id = await q.get()
        try:
            await run_analysis_pipeline(mix_id)
        finally:
            q.task_done()

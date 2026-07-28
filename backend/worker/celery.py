"""
Celery app and tasks. Broker + result backend: same Redis URL as FastAPI (`MIX_API_REDIS_URL` / default).

Worker (from `backend/`):

    celery -A worker.celery worker

Note: `app/worker.py` is the in-process asyncio pipeline; this package (`worker.celery`) is the Celery entrypoint.
"""
from __future__ import annotations

import time

from celery import Celery

from app.config import settings
from app.mix_status_store import set_mix_status_sync

celery = Celery(
    "worker",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    broker_connection_retry_on_startup=True,
)


@celery.task(name="worker.celery.analyze_mix_task")
def analyze_mix_task(mix_id: str) -> dict[str, str]:
    set_mix_status_sync(mix_id, "processing")

    time.sleep(5)

    set_mix_status_sync(mix_id, "completed")

    return {"status": "completed"}

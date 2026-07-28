"""
Shared mix analysis status for `GET /mix-report/{mix_id}` (Redis).

The FastAPI process and Celery workers are separate OS processes; an in-process dict
cannot be updated by the worker. Both use this module with the same `MIX_API_REDIS_URL`
(or default `redis://127.0.0.1:6379/0`).
"""
from __future__ import annotations

from typing import TYPE_CHECKING, Optional

from app.config import settings

if TYPE_CHECKING:
    import redis.asyncio as aioredis

STATUS_KEY_PREFIX = "mix:status:"


def status_key(mix_id: str) -> str:
    return f"{STATUS_KEY_PREFIX}{mix_id}"


_async_redis: Optional["aioredis.Redis"] = None


async def init_mix_status_redis() -> None:
    global _async_redis
    if _async_redis is None:
        import redis.asyncio as aioredis

        _async_redis = aioredis.from_url(settings.redis_url, decode_responses=True)


async def close_mix_status_redis() -> None:
    global _async_redis
    if _async_redis is not None:
        await _async_redis.aclose()
        _async_redis = None


async def get_mix_status(mix_id: str) -> str:
    if _async_redis is None:
        raise RuntimeError("Mix status Redis not initialized (app lifespan).")
    v = await _async_redis.get(status_key(mix_id))
    return v if v else "pending"


async def set_mix_status(mix_id: str, status: str) -> None:
    if _async_redis is None:
        raise RuntimeError("Mix status Redis not initialized (app lifespan).")
    await _async_redis.set(status_key(mix_id), status)


def set_mix_status_sync(mix_id: str, status: str) -> None:
    """Used by Celery tasks (sync)."""
    from redis import Redis

    r = Redis.from_url(settings.redis_url, decode_responses=True)
    try:
        r.set(status_key(mix_id), status)
    finally:
        r.close()

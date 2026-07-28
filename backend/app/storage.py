from __future__ import annotations

import logging
from pathlib import Path

from fastapi import UploadFile

from app.config import settings

log = logging.getLogger(__name__)


class UploadTooLargeError(Exception):
    def __init__(self, max_bytes: int) -> None:
        self.max_bytes = max_bytes
        super().__init__(f"File exceeds maximum size of {max_bytes} bytes")


async def save_upload(file: UploadFile, dest_path: Path) -> int:
    """
    Stream upload to dest_path; raises UploadTooLargeError if over limit.
    Returns bytes written.
    """
    dest_path = dest_path.resolve()
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    dest_dir = dest_path.parent.resolve()
    if not str(dest_path).startswith(str(dest_dir)):
        raise ValueError("Invalid destination path")

    total = 0
    chunk_size = 1024 * 1024
    try:
        with dest_path.open("wb") as out:
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                total += len(chunk)
                if total > settings.max_upload_bytes:
                    out.flush()
                    dest_path.unlink(missing_ok=True)
                    raise UploadTooLargeError(settings.max_upload_bytes)
                out.write(chunk)
    except Exception:
        dest_path.unlink(missing_ok=True)
        raise

    log.info("Saved upload %s (%s bytes)", dest_path, total)
    return total


def write_bytes_to_path(dest_path: Path, data: bytes) -> None:
    """Sync write (call via asyncio.to_thread). Same parent validation as save_upload."""
    dest_path = dest_path.resolve()
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    dest_dir = dest_path.parent.resolve()
    if not str(dest_path).startswith(str(dest_dir)):
        raise ValueError("Invalid destination path")
    dest_path.write_bytes(data)
    log.info("Saved upload %s (%s bytes)", dest_path, len(data))

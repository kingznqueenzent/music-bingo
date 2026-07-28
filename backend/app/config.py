from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="MIX_API_", env_file=".env", extra="ignore")

    # Celery broker/result backend + shared `mix-report` status (see `app/mix_status_store.py`).
    redis_url: str = "redis://127.0.0.1:6379/0"

    upload_dir: Path = Path(__file__).resolve().parent.parent / "uploads"
    max_upload_bytes: int = 250 * 1024 * 1024  # 250 MB
    allowed_extensions: frozenset[str] = frozenset({".mp3", ".mpeg"})
    worker_poll_timeout_sec: float = 0.5


settings = Settings()

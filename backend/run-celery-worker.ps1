# Run from repo root or this folder; expects `redis` reachable at CELERY_BROKER_URL.
Set-Location $PSScriptRoot
celery -A worker.celery worker @args

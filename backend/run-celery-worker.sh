#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
exec celery -A worker.celery worker "$@"

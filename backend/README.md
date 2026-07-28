# Mix analyzer API (FastAPI)

Run three processes locally (three terminals):

| Terminal | What | Command |
|----------|------|---------|
| **1 — Redis** | Broker + Celery results | From repo root: `docker compose up redis` (foreground; Ctrl+C stops Redis) or `docker compose up -d redis` (background). Or `redis-server` if installed. |
| **2 — FastAPI** | HTTP API | `cd backend` then `uvicorn main:app --reload` |
| **3 — Celery** | Mix analysis tasks | `cd backend` then `celery -A worker.celery worker` (add `-l info` for logs; on Windows try `--pool=solo` if the default pool fails). |

**Celery** is configured in `worker/celery.py` (not `app/worker.py`, which is the optional in-process asyncio pipeline). Broker, result backend, and **`GET /mix-report/{id}` status** all use the same Redis URL: default **redis://127.0.0.1:6379/0**, or override with **`MIX_API_REDIS_URL`** in `backend/.env`.

**Quick E2E:** with Redis up, run API + worker, then:

`curl -s -X POST http://127.0.0.1:8000/analyze-mix/test-uuid` → `{"status":"queued"}`; poll `curl -s http://127.0.0.1:8000/mix-report/test-uuid` until `completed` (stub task sleeps ~5s).

Python deps: `pip install -r requirements.txt` from `backend/`.

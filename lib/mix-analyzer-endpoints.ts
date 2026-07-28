/**
 * Mix analyzer HTTP endpoints from the browser.
 *
 * - If `NEXT_PUBLIC_API_URL` is set (e.g. `http://127.0.0.1:8000`), requests go **directly**
 *   to FastAPI. You must allow your Next.js origin in FastAPI CORS (`CORS_ALLOW_ORIGINS`).
 * - If unset, requests use same-origin **`/api/*`** Next.js routes (proxy — see `lib/mix-backend-proxy.ts`).
 */

function publicMixApiBase(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_URL
  if (raw == null || !String(raw).trim()) return null
  return String(raw).trim().replace(/\/$/, '')
}

/** `POST` target for multipart upload (`file` field). */
export function mixUploadUrl(): string {
  const b = publicMixApiBase()
  return b ? `${b}/upload-mix` : '/api/upload-mix'
}

/** `GET` poll URL for mix report JSON. */
export function mixReportUrl(mixId: string): string {
  const b = publicMixApiBase()
  const id = encodeURIComponent(mixId)
  return b ? `${b}/mix-report/${id}` : `/api/mix-report/${id}`
}

/** Minimal `{ status }` poll. */
export function mixStatusUrl(mixId: string): string {
  const b = publicMixApiBase()
  const id = encodeURIComponent(mixId)
  return b ? `${b}/mix-status/${id}` : `/api/mix-status/${id}`
}

/** `{ status, result? }` — `result` when `completed` or `failed`. */
export function mixOutcomeUrl(mixId: string): string {
  const b = publicMixApiBase()
  const id = encodeURIComponent(mixId)
  return b ? `${b}/mix-outcome/${id}` : `/api/mix-outcome/${id}`
}

/** `POST` analyze: path param `mix_id` (Celery queue); no body. */
export function mixAnalyzeFetchArgs(mixId: string): { url: string; init: RequestInit } {
  const id = encodeURIComponent(mixId)
  const b = publicMixApiBase()
  if (b) {
    return {
      url: `${b}/analyze-mix/${id}`,
      init: { method: 'POST' },
    }
  }
  return {
    url: `/api/analyze-mix/${id}`,
    init: { method: 'POST' },
  }
}

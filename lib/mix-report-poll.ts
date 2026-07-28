/**
 * Poll `GET mix-report` until `completed` or `failed` (`pending` / `processing` keep polling).
 *
 * When `NEXT_PUBLIC_API_URL` is unset, `mixReportUrl(mixId)` is `/api/mix-report/${mixId}`.
 *
 * ```ts
 * const stop = pollResults(mixId, {
 *   onData: (data) => setProgress(data),
 *   onCompleted: (data) => { setResult(data); setStatus("completed"); },
 * })
 * ```
 */
import { mixReportUrl } from '@/lib/mix-analyzer-endpoints'
import type { MixReport } from '@/lib/mix-analyzer-types'

export const MIX_REPORT_POLL_INTERVAL_MS = 3000

function apiErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const e = (body as { error?: { message?: string } }).error
    if (e?.message) return e.message
  }
  return `Request failed (${status})`
}

/** Single GET (same URL as `fetch(\`/api/mix-report/${mixId}\`)` when using the Next proxy). */
export async function getMixReport(mixId: string): Promise<MixReport> {
  const res = await fetch(mixReportUrl(mixId), { cache: 'no-store' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(apiErrorMessage(data, res.status))
  return data as MixReport
}

export type PollResultsHandlers = {
  /** Every successful poll while still pending/processing/completed/failed (before terminal stop). */
  onData: (data: MixReport) => void
  onCompleted?: (data: MixReport) => void
  onFailed?: (data: MixReport) => void
  onFetchError?: (err: Error) => void
}

/**
 * `setInterval` poll of mix-report JSON. Returns `stop()` — call on unmount or when replacing the job.
 * Runs an immediate first tick, then every {@link MIX_REPORT_POLL_INTERVAL_MS}.
 */
export function pollResults(mixId: string, handlers: PollResultsHandlers): () => void {
  let intervalId: ReturnType<typeof setInterval> | null = null

  const stop = () => {
    if (intervalId != null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  const tick = async () => {
    try {
      const res = await fetch(mixReportUrl(mixId), { cache: 'no-store' })
      const data = (await res.json()) as MixReport

      if (!res.ok) {
        handlers.onFetchError?.(new Error(apiErrorMessage(data, res.status)))
        stop()
        return
      }

      handlers.onData(data)

      if (data.status === 'completed') {
        stop()
        handlers.onCompleted?.(data)
      } else if (data.status === 'failed') {
        stop()
        handlers.onFailed?.(data)
      }
    } catch (e) {
      stop()
      handlers.onFetchError?.(e instanceof Error ? e : new Error('Poll failed'))
    }
  }

  void tick()
  intervalId = setInterval(() => void tick(), MIX_REPORT_POLL_INTERVAL_MS)

  return stop
}

/** @deprecated Use {@link pollResults} — same behavior. */
export const pollMixReport = pollResults

/** @deprecated Use {@link PollResultsHandlers} */
export type PollMixReportHandlers = PollResultsHandlers

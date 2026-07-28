/**
 * Mix analyzer client. Uses `NEXT_PUBLIC_API_URL` → direct FastAPI, or same-origin `/api/*` proxy.
 */
import type { AnalysisStatus, MixReport, MixUploadResponse } from '@/lib/mix-analyzer-types'
import { getMixReport } from '@/lib/mix-report-poll'
import {
  mixAnalyzeFetchArgs,
  mixOutcomeUrl,
  mixStatusUrl,
  mixUploadUrl,
} from '@/lib/mix-analyzer-endpoints'

function apiErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const e = (body as { error?: { message?: string } }).error
    if (e?.message) return e.message
  }
  return `Request failed (${status})`
}

export async function uploadMixFile(file: File): Promise<MixUploadResponse> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(mixUploadUrl(), { method: 'POST', body: fd })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(apiErrorMessage(data, res.status))
  return data as MixUploadResponse
}

export async function analyzeMix(mixId: string): Promise<{ mix_id: string; status: string }> {
  const { url, init } = mixAnalyzeFetchArgs(mixId)
  const res = await fetch(url, init)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(apiErrorMessage(data, res.status))
  return data as { mix_id: string; status: string }
}

export async function fetchMixReport(mixId: string): Promise<MixReport> {
  return getMixReport(mixId)
}

/** `{ "status": "pending" | "processing" | "completed" | "failed" }` — cheap poll. */
export async function fetchMixStatus(mixId: string): Promise<{ status: string }> {
  const res = await fetch(mixStatusUrl(mixId), { cache: 'no-store' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(apiErrorMessage(data, res.status))
  return data as { status: string }
}

export type MixOutcomePayload = {
  status: AnalysisStatus
  result: Record<string, unknown> | null
}

export async function fetchMixOutcome(mixId: string): Promise<MixOutcomePayload> {
  const res = await fetch(mixOutcomeUrl(mixId), { cache: 'no-store' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(apiErrorMessage(data, res.status))
  return data as MixOutcomePayload
}

export { mixOutcomeUrl, mixStatusUrl, mixUploadUrl } from '@/lib/mix-analyzer-endpoints'

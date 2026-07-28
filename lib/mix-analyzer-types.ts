/** Mix analysis lifecycle returned by GET /mix-report and POST /analyze-mix. */
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed'

/** Upload-page run state; `null` means idle (ready). Errors use a separate message, not this union. */
export type MixAnalyzeRunStatus = 'uploading' | 'analyzing' | 'completed'

export type MixUploadResponse = {
  mix_id: string
  filename: string
  content_type: string | null
  size_bytes: number
  message?: string
}

export type TrackMatch = {
  track_id: string | null
  title: string | null
  artist: string | null
  confidence: number
  segment_start_sec: number | null
  segment_end_sec: number | null
}

export type MixReport = {
  mix_id: string
  filename: string | null
  status: AnalysisStatus
  created_at: string | null
  started_at: string | null
  completed_at: string | null
  summary: Record<string, unknown>
  matches: TrackMatch[]
  error: { code: string; message: string; field?: string | null } | null
}

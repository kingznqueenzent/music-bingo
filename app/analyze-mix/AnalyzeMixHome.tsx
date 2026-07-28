'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { MixAnalysisProgressBar, type MixAnalysisPhase } from '@/components/mix-analyzer/MixAnalysisProgressBar'
import { MixResultsDashboard } from '@/components/mix-analyzer/MixResultsDashboard'
import { MixUploadForm } from '@/components/mix-analyzer/MixUploadForm'
import { analyzeMix } from '@/lib/mix-analyzer-api'
import { pollResults } from '@/lib/mix-report-poll'
import type { MixAnalyzeRunStatus, MixReport, MixUploadResponse } from '@/lib/mix-analyzer-types'

function toProgressPhase(status: MixAnalyzeRunStatus | null, error: string | null): MixAnalysisPhase {
  if (error !== null) return 'error'
  if (status === null) return 'idle'
  return status
}

export function AnalyzeMixHome() {
  const [status, setStatus] = useState<MixAnalyzeRunStatus | null>(null)
  const [result, setResult] = useState<MixReport | null>(null)
  const [uploadPct, setUploadPct] = useState(0)
  const [progressMessage, setProgressMessage] = useState<string | undefined>()
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const [mixId, setMixId] = useState<string | null>(null)
  const stopPollRef = useRef<(() => void) | null>(null)

  const stopPoll = useCallback(() => {
    stopPollRef.current?.()
    stopPollRef.current = null
  }, [])

  useEffect(() => () => stopPoll(), [stopPoll])

  const onUploadProgress = useCallback((pct: number) => {
    setUploadPct(pct)
    if (pct === 0) {
      setStatus('uploading')
      setProgressMessage(undefined)
      setErrorDetail(null)
      setResult(null)
    }
  }, [])

  const startPolling = useCallback(
    (id: string) => {
      stopPoll()
      stopPollRef.current = pollResults(id, {
        onData: (data) => {
          if (data.status === 'processing') {
            setStatus('analyzing')
            setProgressMessage('Processing fingerprints…')
          } else if (data.status === 'pending') {
            setStatus('analyzing')
            setProgressMessage('Waiting in queue…')
          }
        },
        onCompleted: (data) => {
          setResult(data)
          setStatus('completed')
          setProgressMessage(undefined)
          setErrorDetail(null)
        },
        onFailed: (data) => {
          setStatus(null)
          setProgressMessage(undefined)
          setErrorDetail(data.error?.message ?? 'Analysis failed')
        },
        onFetchError: () => {
          setStatus(null)
          setProgressMessage(undefined)
          setErrorDetail("Couldn't load status. Try again.")
        },
      })
    },
    [stopPoll],
  )

  const onUploadSuccess = useCallback(
    async (res: MixUploadResponse) => {
      setErrorDetail(null)
      setResult(null)
      setMixId(res.mix_id)
      setStatus('analyzing')
      setProgressMessage('Starting analysis…')
      try {
        await analyzeMix(res.mix_id)
        setProgressMessage('Waiting for worker…')
        startPolling(res.mix_id)
      } catch {
        setStatus(null)
        setProgressMessage(undefined)
        setErrorDetail("Couldn't start analysis. Try again.")
      }
    },
    [startPolling],
  )

  const onUploadError = useCallback((msg: string) => {
    setStatus(null)
    setProgressMessage(undefined)
    setErrorDetail(msg)
  }, [])

  const reset = useCallback(() => {
    stopPoll()
    setStatus(null)
    setUploadPct(0)
    setProgressMessage(undefined)
    setErrorDetail(null)
    setMixId(null)
    setResult(null)
  }, [stopPoll])

  const uploadLocked = status !== null || errorDetail !== null
  const progressPhase = toProgressPhase(status, errorDetail)
  const progressDetail = errorDetail ? undefined : progressMessage

  return (
    <main className="min-h-[calc(100vh-3rem)] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white px-4 py-10 sm:py-16">
      <div className="max-w-3xl mx-auto text-center mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-brand-neon/90 mb-2">Copyright signal</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-50">
          DJ mix analyzer
        </h1>
        <p className="text-slate-400 mt-3 max-w-lg mx-auto text-sm sm:text-base">
          Upload an MP3. We fingerprint segments and estimate risk. Results need the FastAPI backend
          (<code className="text-cyan-300/90 text-xs">MIX_API_URL</code>).
        </p>
      </div>

      <MixUploadForm
        disabled={uploadLocked}
        onUploadProgress={onUploadProgress}
        onSuccess={onUploadSuccess}
        onError={onUploadError}
      />

      <div className="mt-6 max-w-xl mx-auto text-center space-y-1 min-h-[1.25rem]">
        {status === 'uploading' && <p className="text-sm text-slate-300">Uploading mix...</p>}
        {status === 'analyzing' && <p className="text-sm text-slate-300">Analyzing tracks...</p>}
        {status === 'completed' && <p className="text-sm text-emerald-300">Analysis complete!</p>}
        {errorDetail !== null && (
          <div className="space-y-1">
            <p className="text-sm text-red-300">Something went wrong.</p>
            {errorDetail ? <p className="text-xs text-red-300/80">{errorDetail}</p> : null}
          </div>
        )}
      </div>

      <div className="mt-6">
        <MixAnalysisProgressBar phase={progressPhase} uploadPercent={uploadPct} message={progressDetail} />
      </div>

      {status === 'completed' && result ? (
        <div className="mt-12 max-w-4xl mx-auto border-t border-white/10 pt-10">
          <MixResultsDashboard report={result} />
        </div>
      ) : null}

      {(errorDetail !== null || status === 'completed') && (
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-white/10 hover:bg-white/15 px-5 py-2.5 text-sm font-medium transition-colors"
          >
            Start over
          </button>
          {mixId && errorDetail !== null ? (
            <Link
              href={`/analyze-mix/${mixId}`}
              className="rounded-xl border border-brand-neon/40 text-brand-neon hover:bg-brand-neon/10 px-5 py-2.5 text-sm font-medium transition-colors"
            >
              Open report anyway
            </Link>
          ) : null}
          {mixId && status === 'completed' ? (
            <Link
              href={`/analyze-mix/${mixId}`}
              className="rounded-xl border border-white/20 text-slate-200 hover:bg-white/10 px-5 py-2.5 text-sm font-medium transition-colors"
            >
              Open full report page
            </Link>
          ) : null}
        </div>
      )}
    </main>
  )
}

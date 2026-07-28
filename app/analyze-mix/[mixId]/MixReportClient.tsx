'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MixAnalysisProgressBar } from '@/components/mix-analyzer/MixAnalysisProgressBar'
import { MixResultsDashboard } from '@/components/mix-analyzer/MixResultsDashboard'
import { pollResults } from '@/lib/mix-report-poll'
import type { MixReport } from '@/lib/mix-analyzer-types'

export function MixReportClient({ mixId }: { mixId: string }) {
  const [report, setReport] = useState<MixReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stop = pollResults(mixId, {
      onData: (data) => {
        setReport(data)
        setError(null)
      },
      onFetchError: (err) => {
        setError(err.message)
      },
    })
    return () => stop()
  }, [mixId])

  if (error && !report) {
    return (
      <main className="min-h-[calc(100vh-3rem)] bg-gradient-to-b from-slate-950 to-slate-900 text-white px-4 py-16 text-center">
        <p className="text-red-300 mb-4">{error}</p>
        <Link href="/analyze-mix" className="text-brand-neon underline">
          Back to upload
        </Link>
      </main>
    )
  }

  if (!report) {
    return (
      <main className="min-h-[calc(100vh-3rem)] bg-gradient-to-b from-slate-950 to-slate-900 text-white px-4 py-16">
        <div className="max-w-xl mx-auto">
          <MixAnalysisProgressBar
            phase="analyzing"
            uploadPercent={100}
            message="Loading report…"
          />
        </div>
      </main>
    )
  }

  if (report.status !== 'completed' && report.status !== 'failed') {
    return (
      <main className="min-h-[calc(100vh-3rem)] bg-gradient-to-b from-slate-950 to-slate-900 text-white px-4 py-16">
        <div className="max-w-xl mx-auto space-y-6">
          <h1 className="text-xl font-bold text-center">Analysis in progress</h1>
          <MixAnalysisProgressBar
            phase="analyzing"
            uploadPercent={100}
            message={`Status: ${report.status}`}
          />
          <p className="text-center text-sm text-slate-500 font-mono">{mixId}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-3rem)] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white px-4 py-10 sm:py-14">
      <MixResultsDashboard report={report} />
    </main>
  )
}

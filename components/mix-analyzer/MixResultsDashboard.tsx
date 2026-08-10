'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, Disc3, Music2, ShieldAlert } from 'lucide-react'
import type { MixReport } from '@/lib/mix-analyzer-types'

type Props = {
  report: MixReport
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function MixResultsDashboard({ report }: Props) {
  const { summary, matches, error, status } = report
  const risk = typeof summary.predicted_youtube_risk === 'string' ? summary.predicted_youtube_risk : '—'
  const conf =
    typeof summary.risk_confidence === 'number'
      ? Math.round(summary.risk_confidence * 100)
      : null
  const distinct =
    typeof summary.distinct_tracks_estimate === 'number' ? summary.distinct_tracks_estimate : null
  const notes = typeof summary.notes === 'string' ? summary.notes : null

  const ok = status === 'completed' && !error

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Mix report</h1>
          <p className="text-slate-400 text-sm mt-1 font-mono truncate max-w-md">
            {report.filename ?? report.mix_id}
          </p>
        </div>
        <Link
          href="/analyze-mix"
          className="inline-flex items-center justify-center rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/5 transition-colors"
        >
          Analyze another mix
        </Link>
      </div>

      <div
        className={`rounded-2xl border p-5 flex gap-4 ${
          ok
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : error || status === 'failed'
              ? 'border-red-500/35 bg-red-500/5'
              : 'border-amber-500/30 bg-amber-500/5'
        }`}
      >
        {ok ? (
          <CheckCircle2 className="h-8 w-8 text-emerald-400 shrink-0" aria-hidden />
        ) : error || status === 'failed' ? (
          <ShieldAlert className="h-8 w-8 text-red-400 shrink-0" aria-hidden />
        ) : (
          <AlertCircle className="h-8 w-8 text-amber-400 shrink-0" aria-hidden />
        )}
        <div className="min-w-0">
          <p className="font-semibold text-slate-100">
            Status:{' '}
            <span className="capitalize">{status}</span>
          </p>
          {error ? (
            <p className="text-sm text-red-200/90 mt-1">
              {error.code}: {error.message}
            </p>
          ) : (
            <p className="text-sm text-slate-400 mt-1">
              Completed {formatTime(report.completed_at)}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<ShieldAlert className="h-5 w-5 text-green-400" />}
          label="YouTube risk (model)"
          value={String(risk)}
          hint={conf != null ? `${conf}% confidence` : undefined}
        />
        <StatCard
          icon={<Disc3 className="h-5 w-5 text-violet-400" />}
          label="Tracks estimated"
          value={distinct != null ? String(distinct) : '—'}
        />
        <StatCard
          icon={<Music2 className="h-5 w-5 text-emerald-400" />}
          label="Matches"
          value={String(matches.length)}
        />
      </div>

      {notes ? (
        <p className="text-sm text-slate-500 border-l-2 border-white/10 pl-4">{notes}</p>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Music2 className="h-5 w-5 text-brand-neon" />
          Detected segments
        </h2>
        {matches.length === 0 ? (
          <p className="text-slate-500 text-sm py-8 text-center rounded-xl border border-dashed border-white/10">
            No track matches returned. Configure your catalog on the API or re-run analysis.
          </p>
        ) : (
          <ul className="space-y-3">
            {matches.map((m, i) => (
              <li
                key={`${m.track_id ?? 'x'}-${i}`}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div>
                  <p className="font-medium text-slate-100">
                    {m.title ?? 'Unknown title'}
                    {m.artist ? (
                      <span className="text-slate-400 font-normal"> — {m.artist}</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    {m.segment_start_sec != null && m.segment_end_sec != null
                      ? `${formatSec(m.segment_start_sec)} – ${formatSec(m.segment_end_sec)}`
                      : '—'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center rounded-lg bg-green-500/15 text-green-200 px-3 py-1 text-sm font-medium tabular-nums">
                    {Math.round(m.confidence * 100)}% match
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
      <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wide mb-2">
        {icon}
        {label}
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      {hint ? <p className="text-xs text-slate-500 mt-1">{hint}</p> : null}
    </div>
  )
}

function formatSec(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

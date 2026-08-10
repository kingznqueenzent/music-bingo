'use client'

/** User-facing flow on the analyze-mix upload page. */
export type MixAnalysisPhase = 'idle' | 'uploading' | 'analyzing' | 'completed' | 'error'

/** @deprecated Use `MixAnalysisPhase`; `pending`/`processing`/`failed` map to analyzing/error for legacy callers. */
export type MixFlowStatus = MixAnalysisPhase | 'pending' | 'processing' | 'failed'

type Props = {
  /** Prefer `phase`. If omitted, `status` is normalized to a phase. */
  phase?: MixAnalysisPhase
  /** Legacy prop — normalized: pending|processing → analyzing, failed → error */
  status?: MixFlowStatus
  uploadPercent: number
  /** Extra detail under the headline; overrides default hint for the phase when set. */
  message?: string
}

function normalizePhase(status: MixFlowStatus | undefined, phase: MixAnalysisPhase | undefined): MixAnalysisPhase {
  if (phase) return phase
  if (status == null) return 'idle'
  switch (status) {
    case 'pending':
    case 'processing':
      return 'analyzing'
    case 'failed':
      return 'error'
    case 'idle':
    case 'uploading':
    case 'analyzing':
    case 'completed':
    case 'error':
      return status
    default:
      return 'idle'
  }
}

const phaseHeadline: Record<MixAnalysisPhase, string> = {
  idle: 'Ready',
  uploading: 'Uploading mix…',
  analyzing: 'Analyzing mix…',
  completed: 'Analysis complete',
  error: 'Something went wrong',
}

const phaseHint: Record<MixAnalysisPhase, string | undefined> = {
  idle: undefined,
  uploading: 'Sending your file to the server…',
  analyzing: 'Fingerprinting and matching against the catalog — usually under a minute.',
  completed: 'Results are shown below.',
  error: undefined,
}

function barWidth(phase: MixAnalysisPhase, uploadPct: number): number {
  switch (phase) {
    case 'idle':
      return 0
    case 'uploading':
      return Math.min(35, Math.max(4, Math.round(uploadPct * 0.35)))
    case 'analyzing':
      return 72
    case 'completed':
      return 100
    case 'error':
      return 100
    default:
      return 0
  }
}

export function MixAnalysisProgressBar({ phase: phaseProp, status, uploadPercent, message }: Props) {
  const phase = normalizePhase(status, phaseProp)
  const w = barWidth(phase, uploadPercent)
  const isError = phase === 'error'
  const detail = message ?? phaseHint[phase]

  return (
    <div className="w-full max-w-xl mx-auto space-y-3">
      <div className="flex justify-between text-sm">
        <span className={isError ? 'text-red-400' : 'text-slate-300'}>{phaseHeadline[phase]}</span>
        <span className="text-slate-500 tabular-nums">{w}%</span>
      </div>
      <div
        className={`h-3 rounded-full overflow-hidden bg-white/10 ${isError ? 'ring-1 ring-red-500/40' : ''}`}
        role="progressbar"
        aria-valuenow={w}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={phaseHeadline[phase]}
        aria-busy={phase === 'uploading' || phase === 'analyzing'}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isError
              ? 'bg-red-500'
              : phase === 'completed'
                ? 'bg-emerald-400'
                : 'bg-gradient-to-r from-green-500 to-brand-neon'
          }`}
          style={{ width: `${w}%` }}
        />
      </div>
      {detail ? (
        <p className={`text-sm ${isError ? 'text-red-300' : 'text-slate-400'}`}>{detail}</p>
      ) : null}
    </div>
  )
}

/** @deprecated use MixAnalysisPhase */
export type MixProgressPhase = MixFlowStatus

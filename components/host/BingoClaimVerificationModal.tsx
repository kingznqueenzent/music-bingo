'use client'

import { Loader2, X } from 'lucide-react'
import type { EvaluatorPattern } from '@/lib/bingo-evaluator'

const PATTERN_LABELS: Record<string, string> = {
  LINE: 'Single Line',
  CORNERS: 'Four Corners',
  X_PATTERN: 'X-Pattern',
  BLACKOUT: 'Blackout',
}

export type ClaimMatrixCell = {
  position: number
  title: string | null
  /** Host has called this track. */
  called: boolean
  /** Player marked this cell in their claim. */
  marked: boolean
  /** Part of the winning line when valid. */
  winning?: boolean
}

export type BingoClaimVerificationModalProps = {
  open: boolean
  playerName: string
  cardId: string
  pattern: EvaluatorPattern | string
  gridSize: 4 | 5
  cells: ClaimMatrixCell[]
  valid: boolean
  validationError?: string | null
  approveLoading?: boolean
  rejectLoading?: boolean
  onApprove: () => void
  onReject: () => void
  onDismiss: () => void
}

/** High-priority host modal when a player taps CALL BINGO. */
export function BingoClaimVerificationModal({
  open,
  playerName,
  cardId,
  pattern,
  gridSize,
  cells,
  valid,
  validationError,
  approveLoading = false,
  rejectLoading = false,
  onApprove,
  onReject,
  onDismiss,
}: BingoClaimVerificationModalProps) {
  if (!open) return null

  const busy = approveLoading || rejectLoading
  const patternLabel = PATTERN_LABELS[String(pattern)] ?? String(pattern)
  const sorted = [...cells].sort((a, b) => a.position - b.position)

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-win-modal-in"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="bingo-claim-verify-title"
    >
      <div
        className="w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-2xl border-2 border-[#00FF66]/70 bg-gradient-to-b from-[#1E1E1E] to-[#121212] shadow-[0_0_56px_rgba(0,255,102,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-white/10 bg-[#1E1E1E]/95 backdrop-blur-sm">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#00FF66] mb-1">
              Instant bingo claim
            </p>
            <h2 id="bingo-claim-verify-title" className="text-xl sm:text-2xl font-black text-white truncate">
              {playerName || 'Player'}
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">
              Pattern: {patternLabel}
              <span className="text-slate-600 font-mono text-xs ml-2">
                Card {cardId.slice(0, 8)}…
              </span>
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onDismiss}
            className="shrink-0 h-10 w-10 rounded-lg border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 disabled:opacity-50"
            aria-label="Dismiss claim"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
              valid
                ? 'border-[#00FF66]/50 bg-[#00FF66]/10 text-[#00FF66]'
                : 'border-amber-500/50 bg-amber-500/10 text-amber-200'
            }`}
            role="status"
          >
            {valid
              ? 'Valid vs called tracks — approve to trigger win animation.'
              : validationError || 'Claim does not match called tracks / pattern.'}
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Submitted card</p>
            <div
              className="bingo-grid w-full inline-grid gap-1 p-2 rounded-xl bg-slate-900/80 border border-white/5"
              style={{
                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${gridSize}, auto)`,
              }}
            >
              {sorted.map((cell) => {
                let cellClass = 'bg-slate-700/70 text-slate-400'
                if (cell.winning) {
                  cellClass = 'bg-[#00FF66] text-[#121212] ring-2 ring-[#00FF66]/80'
                } else if (cell.marked && cell.called) {
                  cellClass = 'bg-emerald-600/80 text-white'
                } else if (cell.marked && !cell.called) {
                  cellClass = 'bg-red-600/70 text-white'
                } else if (cell.called) {
                  cellClass = 'bg-amber-600/40 text-amber-100'
                }
                return (
                  <div
                    key={cell.position}
                    className={`bingo-cell rounded-md px-1 py-1.5 font-medium min-h-10 min-w-0 flex items-center justify-center text-center text-[10px] sm:text-xs leading-tight ${cellClass}`}
                    title={cell.title ?? undefined}
                  >
                    <span className="line-clamp-2 break-words">{cell.title?.trim() || '—'}</span>
                  </div>
                )
              })}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Green = called + marked · Red = marked but not called · Amber = called only · Neon = winning line
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-1 pb-2">
            <button
              type="button"
              disabled={busy || !valid}
              onClick={onApprove}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#00FF66] hover:bg-green-300 disabled:opacity-40 disabled:cursor-not-allowed text-[#121212] font-bold py-3.5 text-sm sm:text-base transition-colors touch-manipulation min-h-12"
            >
              {approveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {approveLoading ? 'Approving…' : 'Approve (Trigger Win Animation)'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onReject}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/60 bg-red-500/15 hover:bg-red-500/25 disabled:opacity-50 text-red-200 font-semibold py-3 text-sm transition-colors touch-manipulation min-h-12"
            >
              {rejectLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {rejectLoading ? 'Rejecting…' : 'Reject (False Alarm)'}
            </button>
            {!valid ? (
              <p className="text-center text-xs text-slate-500">
                Approve is disabled until the claim matches called tracks.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import type { EvaluatorPattern } from '@/lib/bingo-evaluator'

const PATTERN_LABELS: Record<string, string> = {
  LINE: 'Single Line',
  CORNERS: 'Four Corners',
  X_PATTERN: 'X-Pattern',
  BLACKOUT: 'Blackout',
}

export type WinnersCircleProps = {
  open: boolean
  playerName: string
  cardId: string
  pattern: EvaluatorPattern | string
  avatarUrl?: string | null
  verified?: boolean
  confirmLoading?: boolean
  onConfirmWin: () => void
  onLaunchPrizeWheel: () => void
  onDismiss: () => void
}

export function WinnersCircle({
  open,
  playerName,
  cardId,
  pattern,
  avatarUrl,
  verified = false,
  confirmLoading = false,
  onConfirmWin,
  onLaunchPrizeWheel,
  onDismiss,
}: WinnersCircleProps) {
  if (!open) return null

  const patternLabel = PATTERN_LABELS[pattern] ?? String(pattern)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-win-modal-in"
      role="dialog"
      aria-labelledby="winners-circle-title"
    >
      <div className="relative w-full max-w-md rounded-2xl border-2 border-[#FFD700]/70 bg-gradient-to-b from-[#1E1E1E] to-[#121212] p-6 shadow-[0_0_48px_rgba(255,215,0,0.35)]">
        <div className="absolute inset-0 rounded-2xl pointer-events-none animate-bingo-gold-flash opacity-30" />
        <div className="relative text-center">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="w-16 h-16 rounded-full mx-auto mb-3 object-cover border-2 border-[#FFD700]/60"
            />
          ) : (
            <div className="w-16 h-16 rounded-full mx-auto mb-3 bg-[#FFD700]/20 border-2 border-[#FFD700]/60 flex items-center justify-center text-3xl">
              🏆
            </div>
          )}
          <p className="text-xs uppercase tracking-[0.2em] text-[#FFD700]/80 font-semibold mb-1">
            {verified ? 'Verified BINGO' : 'BINGO Claim'}
          </p>
          <h2 id="winners-circle-title" className="text-2xl font-black text-[#FFD700] mb-1">
            {playerName}
          </h2>
          <p className="text-slate-400 text-sm mb-1">Pattern: {patternLabel}</p>
          <p className="text-slate-500 text-xs font-mono mb-6">Card {cardId.slice(0, 8)}…</p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onConfirmWin}
              disabled={confirmLoading}
              className="w-full rounded-xl bg-[#FFD700] hover:bg-yellow-300 disabled:opacity-50 text-[#121212] font-bold py-3 transition-colors"
            >
              {confirmLoading ? 'Confirming…' : 'Confirm Win'}
            </button>
            <button
              type="button"
              onClick={onLaunchPrizeWheel}
              className="w-full rounded-xl border border-[#00FF66]/50 text-[#00FF66] hover:bg-[#00FF66]/10 font-semibold py-3 transition-colors"
            >
              Launch Prize Wheel
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="w-full rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2.5 mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

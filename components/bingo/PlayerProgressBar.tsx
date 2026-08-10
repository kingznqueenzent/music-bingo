'use client'

import type { WinPattern } from '@/lib/bingo-win-pattern'

export type PlayerProgressBarProps = {
  current: number
  target: number
  label: string
  mode: WinPattern
  className?: string
}

const MODE_HINT: Record<WinPattern, string> = {
  line: 'Complete any row, column, or diagonal',
  corners: 'Mark all four corner squares',
  x: 'Mark both diagonals for an X',
  blackout: 'Mark every square on the card',
}

export function PlayerProgressBar({
  current,
  target,
  label,
  mode,
  className = '',
}: PlayerProgressBarProps) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0

  return (
    <div className={`rounded-xl border border-[#00FF66]/25 bg-[#1E1E1E]/90 p-3 ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Progress</p>
        <p className="text-sm font-bold text-[#00FF66] tabular-nums">{label}</p>
      </div>
      <div
        className="h-2.5 rounded-full bg-[#121212] border border-white/10 overflow-hidden"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#00FF66]/70 to-[#FFD700]/90 transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-slate-500 mt-2">{MODE_HINT[mode]}</p>
    </div>
  )
}

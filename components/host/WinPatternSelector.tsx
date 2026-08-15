'use client'

import type { WinPattern } from '@/lib/bingo-win-pattern'

export const WIN_PATTERN_OPTIONS: { value: WinPattern; label: string }[] = [
  { value: 'line', label: 'Standard Line' },
  { value: 'corners', label: 'Four Corners' },
  { value: 'x', label: 'The Letter X' },
  { value: 'blackout', label: 'Blackout' },
]

type WinPatternSelectorProps = {
  value: WinPattern
  onChange: (pattern: WinPattern) => void
  /** Compact pill buttons (default) or dropdown select */
  variant?: 'pills' | 'select'
  className?: string
  hint?: string
}

export function WinPatternSelector({
  value,
  onChange,
  variant = 'pills',
  className = '',
  hint,
}: WinPatternSelectorProps) {
  if (variant === 'select') {
    return (
      <div className={className}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as WinPattern)}
          className="w-full max-w-xs p-3 rounded-xl lg-neon-input text-sm"
          aria-label="Win pattern"
        >
          {WIN_PATTERN_OPTIONS.map((p) => (
            <option key={p.value} value={p.value} className="bg-[#1E1E1E]">
              {p.label}
            </option>
          ))}
        </select>
        {hint ? <p className="text-white/35 text-xs mt-2">{hint}</p> : null}
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Win pattern">
        {WIN_PATTERN_OPTIONS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors touch-manipulation min-h-10 ${
              value === p.value
                ? 'bg-[#FFD700] text-[#121212]'
                : 'bg-[var(--lg-canvas)] text-white/60 hover:bg-white/10'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {hint ? <p className="text-white/35 text-xs mt-2">{hint}</p> : null}
    </div>
  )
}

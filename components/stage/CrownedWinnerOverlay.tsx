'use client'

import { useEffect } from 'react'
import confetti from 'canvas-confetti'

const PATTERN_LABELS: Record<string, string> = {
  LINE: 'Single Line',
  line: 'Single Line',
  CORNERS: 'Four Corners',
  corners: 'Four Corners',
  X_PATTERN: 'X-Pattern',
  x: 'X-Pattern',
  BLACKOUT: 'Blackout',
  blackout: 'Full House',
}

export type CrownedWinnerOverlayProps = {
  open: boolean
  playerName: string
  pattern?: string
  avatarUrl?: string | null
  level?: number
  levelTitle?: string
  onDismiss?: () => void
}

function fireWinnerConfetti() {
  const duration = 3600
  const end = Date.now() + duration
  const colors = ['#00FF66', '#FFD700', '#ffffff', '#a78bfa', '#f472b6']

  confetti({
    particleCount: 160,
    spread: 120,
    startVelocity: 45,
    origin: { y: 0.5 },
    colors,
  })
  confetti({
    particleCount: 80,
    angle: 60,
    spread: 70,
    origin: { x: 0, y: 0.6 },
    colors,
  })
  confetti({
    particleCount: 80,
    angle: 120,
    spread: 70,
    origin: { x: 1, y: 0.6 },
    colors,
  })

  const frame = () => {
    confetti({
      particleCount: 6,
      angle: 60,
      spread: 60,
      origin: { x: 0, y: 0.7 },
      colors,
    })
    confetti({
      particleCount: 6,
      angle: 120,
      spread: 60,
      origin: { x: 1, y: 0.7 },
      colors,
    })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}

export function CrownedWinnerOverlay({
  open,
  playerName,
  pattern,
  avatarUrl,
  level,
  levelTitle,
  onDismiss,
}: CrownedWinnerOverlayProps) {
  useEffect(() => {
    if (!open) return
    fireWinnerConfetti()
  }, [open, playerName])

  if (!open) return null

  const patternLabel = pattern ? (PATTERN_LABELS[pattern] ?? pattern) : 'BINGO'

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 md:backdrop-blur-md animate-stage-celebrate victory-overlay-flash"
      role="dialog"
      aria-labelledby="crowned-winner-title"
    >
      <div className="relative flex flex-col items-center text-center px-8 max-w-4xl animate-crown-breathe">
        <div className="absolute inset-0 -z-10 rounded-full blur-3xl bg-[#00FF66]/20 animate-crown-glow" />
        <div className="animate-crown-pop text-7xl md:text-9xl mb-4 drop-shadow-[0_0_32px_rgba(255,215,0,0.8)]">
          👑
        </div>
        <p className="text-sm md:text-base uppercase tracking-[0.35em] text-[#FFD700]/90 font-bold mb-2">
          Winner Crowned
        </p>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-[#FFD700]/70 shadow-[0_0_32px_rgba(255,215,0,0.45)] mb-4"
          />
        ) : (
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-[#FFD700]/15 border-4 border-[#FFD700]/50 flex items-center justify-center text-5xl mb-4">
            🏆
          </div>
        )}
        <h2
          id="crowned-winner-title"
          className="text-5xl md:text-8xl font-black text-white mb-3 drop-shadow-[0_0_24px_rgba(0,255,102,0.55)]"
          style={{ fontFamily: 'var(--font-inter), sans-serif' }}
        >
          {playerName}
        </h2>
        {(level != null || levelTitle) && (
          <p className="text-xl md:text-2xl font-semibold text-[#00FF66] mb-2">
            Level {level ?? '—'}
            {levelTitle ? ` · ${levelTitle}` : ''}
          </p>
        )}
        <p className="text-2xl md:text-3xl text-[#FFD700] font-bold mb-8">{patternLabel}</p>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full border border-white/30 bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-3 text-lg transition-colors"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  )
}

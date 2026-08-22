'use client'

import { useCallback, useEffect, useState } from 'react'
import type { SoundEffectPayload } from '@/lib/supabase-realtime'
import { playSoundEffect, preloadSfxAssets } from '@/lib/sfx/play-sfx'

export type SfxBounceFlashProps = {
  label: string
  variant?: 'stage' | 'overlay'
}

export function SfxBounceFlash({ label, variant = 'stage' }: SfxBounceFlashProps) {
  const isOverlay = variant === 'overlay'
  return (
    <div
      className={`pointer-events-none fixed z-[95] animate-bounce ${
        isOverlay ? 'bottom-8 left-1/2 -translate-x-1/2' : 'bottom-16 left-1/2 -translate-x-1/2'
      }`}
      role="status"
      aria-live="polite"
    >
      <div
        className={`rounded-2xl border-2 px-6 py-3 font-black uppercase tracking-wider ${
          isOverlay
            ? 'border-[var(--magenta)]/70 bg-[var(--bg-deep)]/70 text-[var(--cyan)] text-lg backdrop-blur-md shadow-[0_0_40px_var(--gold-glow)]'
            : 'border-[#00FF66] bg-[#121212]/95 text-[#00FF66] text-xl md:text-2xl shadow-[0_0_40px_rgba(0,255,102,0.45)]'
        }`}
      >
        🔊 {label}
      </div>
    </div>
  )
}

export type SoundEffectBounce = { label: string; key: number }

/** Returns a stable handler to pass into subscribeStageChannel (single channel per view). */
export function useSoundEffectPlayback() {
  const [bounce, setBounce] = useState<SoundEffectBounce | null>(null)

  useEffect(() => {
    preloadSfxAssets()
  }, [])

  const onSoundEffect = useCallback((payload: SoundEffectPayload) => {
    const { label, durationMs } = playSoundEffect(payload)
    const key = Date.now()
    setBounce({ label, key })
    window.setTimeout(() => {
      setBounce((prev) => (prev?.key === key ? null : prev))
    }, Math.min(durationMs + 400, 2500))
  }, [])

  return { bounce, onSoundEffect }
}

export type SoundEffectReceiverProps = {
  bounce: SoundEffectBounce | null
  variant?: 'stage' | 'overlay'
}

/** Renders the SFX bounce flash; subscription lives on the parent stage/overlay channel. */
export function SoundEffectReceiver({ bounce, variant = 'stage' }: SoundEffectReceiverProps) {
  if (!bounce) return null
  return <SfxBounceFlash key={bounce.key} label={bounce.label} variant={variant} />
}

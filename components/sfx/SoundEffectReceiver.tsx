'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { subscribeStageChannel, type SoundEffectPayload } from '@/lib/supabase-realtime'
import { playSoundEffect } from '@/lib/sfx/play-sfx'

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
        className={`rounded-2xl border-2 px-6 py-3 font-black uppercase tracking-wider shadow-[0_0_40px_rgba(0,255,102,0.45)] ${
          isOverlay
            ? 'border-[#00FF66]/60 bg-black/70 text-[#00FF66] text-lg backdrop-blur-md'
            : 'border-[#00FF66] bg-[#121212]/95 text-[#00FF66] text-xl md:text-2xl'
        }`}
      >
        🔊 {label}
      </div>
    </div>
  )
}

export type SoundEffectReceiverProps = {
  gameId: string
  variant?: 'stage' | 'overlay'
}

/** Subscribes to host SFX broadcasts, plays audio, and shows a brief visual bounce. */
export function SoundEffectReceiver({ gameId, variant = 'stage' }: SoundEffectReceiverProps) {
  const supabase = useMemo(() => createClient(), [])
  const [bounce, setBounce] = useState<{ label: string; key: number } | null>(null)

  useEffect(() => {
    const channel = subscribeStageChannel(supabase, gameId, {
      onSoundEffect: (payload: SoundEffectPayload) => {
        const { label, durationMs } = playSoundEffect(payload)
        const key = Date.now()
        setBounce({ label, key })
        window.setTimeout(() => {
          setBounce((prev) => (prev?.key === key ? null : prev))
        }, Math.min(durationMs + 400, 2500))
      },
    })
    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, supabase])

  if (!bounce) return null
  return <SfxBounceFlash key={bounce.key} label={bounce.label} variant={variant} />
}

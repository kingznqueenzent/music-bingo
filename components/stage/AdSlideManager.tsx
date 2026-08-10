'use client'

import { useEffect, useMemo, useState } from 'react'
import type { GameSponsor } from '@/lib/supabase/types'

export type AdSlideManagerProps = {
  sponsors: GameSponsor[]
  active?: boolean
  intervalMs?: number
  className?: string
}

const FALLBACK_SLIDES = [
  { name: 'LyricGrid', logo_url: null, tagline: 'Music Bingo for Venues' },
  { name: 'Join on your phone', logo_url: null, tagline: 'Scan the QR or enter the room code' },
]

export function AdSlideManager({
  sponsors,
  active = true,
  intervalMs = 8000,
  className = '',
}: AdSlideManagerProps) {
  const slides = useMemo(() => {
    if (sponsors.length > 0) {
      return sponsors.map((s) => ({
        name: s.name,
        logo_url: s.logo_url,
        tagline: 'Proud sponsor',
      }))
    }
    return FALLBACK_SLIDES
  }, [sponsors])

  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!active || slides.length <= 1) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [active, slides.length, intervalMs])

  if (!active) return null

  const slide = slides[index]!

  return (
    <div
      className={`relative w-full aspect-video rounded-2xl overflow-hidden border border-[#00FF66]/20 bg-[#1E1E1E] flex flex-col items-center justify-center p-8 animate-stage-song-in ${className}`}
      aria-live="polite"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,102,0.08),transparent_70%)]" />
      {slide.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={slide.logo_url}
          alt={slide.name}
          className="relative z-10 max-h-[40%] max-w-[70%] object-contain mb-6 drop-shadow-[0_0_24px_rgba(0,255,102,0.35)]"
        />
      ) : (
        <div className="relative z-10 text-6xl md:text-8xl mb-4">🎵</div>
      )}
      <h3
        className="relative z-10 text-3xl md:text-5xl font-black text-[#00FF66] text-center tracking-tight"
        style={{ fontFamily: 'var(--font-inter), sans-serif' }}
      >
        {slide.name}
      </h3>
      <p className="relative z-10 text-lg md:text-2xl text-slate-400 mt-2 text-center">{slide.tagline}</p>
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === index ? 'w-8 bg-[#00FF66]' : 'w-2 bg-slate-600'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

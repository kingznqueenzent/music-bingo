'use client'

import { useEffect, useRef, useState } from 'react'

interface ClipAudioPlayerProps {
  src: string
  startSeconds?: number
  clipSeconds: number
  crossfadeSeconds?: number
  autoPlay?: boolean
  onEnded?: () => void
  className?: string
}

/** Timed MP3 hook player with optional crossfade (mirrors YouTubeClipPlayer behaviour). */
export function ClipAudioPlayer({
  src,
  startSeconds = 0,
  clipSeconds,
  crossfadeSeconds = 0,
  autoPlay = true,
  onEnded,
  className = '',
}: ClipAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const clipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const clearTimers = () => {
      if (clipTimerRef.current) {
        clearTimeout(clipTimerRef.current)
        clipTimerRef.current = null
      }
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current)
        fadeTimerRef.current = null
      }
    }

    clearTimers()
    setOpacity(1)

    const durationMs = Math.max(500, clipSeconds * 1000)
    const fadeMs = Math.min(Math.max(0, crossfadeSeconds) * 1000, durationMs - 500)

    const startPlayback = () => {
      try {
        audio.currentTime = startSeconds
      } catch {
        // ignore seek errors before metadata
      }
      if (autoPlay) {
        void audio.play().catch(() => {
          // autoplay blocked — host can use controls
        })
      }

      if (fadeMs > 0) {
        fadeTimerRef.current = setTimeout(() => setOpacity(0), durationMs - fadeMs)
      }

      clipTimerRef.current = setTimeout(() => {
        audio.pause()
        clearTimers()
        setOpacity(1)
        onEnded?.()
      }, durationMs)
    }

    const onLoaded = () => startPlayback()
    audio.addEventListener('loadedmetadata', onLoaded)
    if (audio.readyState >= 1) onLoaded()

    return () => {
      clearTimers()
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.pause()
      setOpacity(1)
    }
  }, [src, startSeconds, clipSeconds, crossfadeSeconds, autoPlay, onEnded])

  return (
    <div
      className={className}
      style={{
        opacity,
        transition: crossfadeSeconds > 0 ? `opacity ${crossfadeSeconds}s ease-out` : undefined,
      }}
    >
      <audio ref={audioRef} src={src} controls preload="auto" className="w-full max-w-2xl rounded-xl" />
    </div>
  )
}

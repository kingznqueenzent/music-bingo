'use client'

import { useEffect, useRef, useState } from 'react'

export type AudioReadyState = 'idle' | 'loading' | 'ready' | 'error'

interface ClipAudioPlayerProps {
  src: string
  startSeconds?: number
  clipSeconds: number
  crossfadeSeconds?: number
  autoPlay?: boolean
  muted?: boolean
  showControls?: boolean
  showStatus?: boolean
  onEnded?: () => void
  onReadyChange?: (state: AudioReadyState, detail?: { bufferedPct: number; latencyMs: number | null }) => void
  className?: string
}

/** Timed MP3 hook player with preload, buffer readiness, and soft error fallback. */
export function ClipAudioPlayer({
  src,
  startSeconds = 0,
  clipSeconds,
  crossfadeSeconds = 0,
  autoPlay = true,
  muted = false,
  showControls = true,
  showStatus = true,
  onEnded,
  onReadyChange,
  className = '',
}: ClipAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const clipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadStartedRef = useRef<number>(0)
  const [opacity, setOpacity] = useState(1)
  const [readyState, setReadyState] = useState<AudioReadyState>('loading')
  const [bufferedPct, setBufferedPct] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [latencyMs, setLatencyMs] = useState<number | null>(null)

  useEffect(() => {
    onReadyChange?.(readyState, { bufferedPct, latencyMs })
  }, [readyState, bufferedPct, latencyMs, onReadyChange])

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
    setReadyState('loading')
    setBufferedPct(0)
    setErrorMsg('')
    setLatencyMs(null)
    loadStartedRef.current = performance.now()

    const durationMs = Math.max(500, clipSeconds * 1000)
    const fadeMs = Math.min(Math.max(0, crossfadeSeconds) * 1000, durationMs - 500)

    const updateBuffer = () => {
      try {
        if (!audio.duration || !Number.isFinite(audio.duration)) return
        let bufferedEnd = 0
        for (let i = 0; i < audio.buffered.length; i++) {
          bufferedEnd = Math.max(bufferedEnd, audio.buffered.end(i))
        }
        const pct = Math.min(100, Math.round((bufferedEnd / audio.duration) * 100))
        setBufferedPct(pct)
      } catch {
        /* ignore */
      }
    }

    const markReady = () => {
      const ms = Math.round(performance.now() - loadStartedRef.current)
      setLatencyMs(ms)
      setReadyState('ready')
      updateBuffer()
    }

    const startPlayback = () => {
      try {
        audio.currentTime = startSeconds
      } catch {
        // ignore seek errors before metadata
      }
      markReady()
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
    const onCanPlayThrough = () => {
      updateBuffer()
      markReady()
    }
    const onProgress = () => updateBuffer()
    const onError = () => {
      setReadyState('error')
      setErrorMsg('Audio failed to load — check Supabase storage URL or network.')
      clearTimers()
    }

    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('canplaythrough', onCanPlayThrough)
    audio.addEventListener('progress', onProgress)
    audio.addEventListener('error', onError)
    audio.muted = muted
    audio.preload = 'auto'
    audio.load()
    if (audio.readyState >= 1) onLoaded()

    return () => {
      clearTimers()
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('canplaythrough', onCanPlayThrough)
      audio.removeEventListener('progress', onProgress)
      audio.removeEventListener('error', onError)
      audio.pause()
      setOpacity(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- readyState read only for guard inside canplaythrough
  }, [src, startSeconds, clipSeconds, crossfadeSeconds, autoPlay, muted, onEnded])

  return (
    <div className={className}>
      <div
        style={{
          opacity,
          transition: crossfadeSeconds > 0 ? `opacity ${crossfadeSeconds}s ease-out` : undefined,
        }}
      >
        <audio
          ref={audioRef}
          src={src}
          controls
          preload="auto"
          className="w-full max-w-2xl rounded-xl"
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
        {readyState === 'loading' ? (
          <span className="text-amber-300">Buffering clip… {bufferedPct}%</span>
        ) : null}
        {readyState === 'ready' ? (
          <span className="text-emerald-400">
            Cached & ready
            {latencyMs != null ? ` · ${latencyMs}ms` : ''}
            {bufferedPct > 0 ? ` · ${bufferedPct}% buffered` : ''}
          </span>
        ) : null}
        {readyState === 'error' ? (
          <span className="text-red-300">{errorMsg}</span>
        ) : null}
      </div>
    </div>
  )
}

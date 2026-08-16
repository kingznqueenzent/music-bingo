'use client'

import { useState, useRef, useEffect, type ReactNode } from 'react'
import { Volume2, Play } from 'lucide-react'

/** Minimal silent WAV — unlocks HTML5 audio on iOS/Android after user gesture. */
const SILENT_WAV =
  'data:audio/wav;base64,T2dnUwACAAAAAAAAAAA8TUEAAAACAAABAAAAAAAAAAAAAAAAAAAAAAEAAAAAAABkYXRhAAAAAA=='

export type PlayerAudioGateProps = {
  currentAudioUrl?: string | null
  startSeconds?: number
  clipSeconds?: number
  isPlaying?: boolean
  playerName?: string
  children: ReactNode
}

/**
 * Blocks the bingo card until the player taps to unlock audio (mobile autoplay policy).
 * `<audio>` is always mounted so the ref exists on the first tap.
 */
export function PlayerAudioGate({
  currentAudioUrl,
  startSeconds = 0,
  clipSeconds = 20,
  isPlaying = false,
  playerName,
  children,
}: PlayerAudioGateProps) {
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const clipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !audioUnlocked) return

    if (clipTimerRef.current) {
      clearTimeout(clipTimerRef.current)
      clipTimerRef.current = null
    }

    if (!currentAudioUrl) {
      audio.pause()
      return
    }

    audio.src = currentAudioUrl
    audio.load()

    if (isPlaying) {
      const playClip = async () => {
        try {
          if (startSeconds > 0) {
            audio.currentTime = startSeconds
          }
          await audio.play()
          clipTimerRef.current = setTimeout(() => {
            audio.pause()
          }, Math.max(500, clipSeconds * 1000))
        } catch (err) {
          console.log('Audio autoplay prevented:', err)
        }
      }
      void playClip()
    } else {
      audio.pause()
    }

    return () => {
      if (clipTimerRef.current) {
        clearTimeout(clipTimerRef.current)
        clipTimerRef.current = null
      }
    }
  }, [currentAudioUrl, isPlaying, audioUnlocked, startSeconds, clipSeconds])

  const handleUnlockAudio = () => {
    const audio = audioRef.current
    if (!audio) {
      setAudioUnlocked(true)
      return
    }

    audio.src = SILENT_WAV
    audio.volume = 0.001
    void audio
      .play()
      .then(() => {
        audio.pause()
        audio.currentTime = 0
        audio.volume = 1
        setAudioUnlocked(true)
      })
      .catch(() => {
        setAudioUnlocked(true)
      })
  }

  const audioElement = (
    <audio ref={audioRef} preload="auto" playsInline className="hidden" aria-hidden />
  )

  if (!audioUnlocked) {
    return (
      <>
        {audioElement}
        <div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#121212]/95 p-6 text-center backdrop-blur-md touch-manipulation"
          style={{ minHeight: '100dvh' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="player-audio-gate-title"
        >
          <div className="w-full max-w-md">
            <div
              className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#00FF66]/60 bg-[#00FF66]/10 shadow-[0_0_40px_rgba(0,255,102,0.25)]"
              aria-hidden
            >
              <Volume2 className="h-10 w-10 text-[#00FF66]" strokeWidth={2.25} />
            </div>

            <h2 id="player-audio-gate-title" className="text-2xl sm:text-3xl font-black text-white mb-3">
              Tap to Enable Audio &amp; Join Game
            </h2>

            {playerName ? (
              <p className="text-[#00FF66]/90 font-semibold mb-2 truncate">{playerName}</p>
            ) : null}

            <p className="text-white/55 text-sm sm:text-base mb-8 leading-relaxed">
              Your browser requires one tap before song clips can play. After this, tracks play automatically when
              the host calls them — even in Blind Mode.
            </p>

            <button
              type="button"
              onPointerDown={(e) => {
                if (e.pointerType === 'touch') {
                  e.preventDefault()
                  handleUnlockAudio()
                }
              }}
              onClick={handleUnlockAudio}
              className="w-full min-h-[4.5rem] rounded-2xl bg-[#00FF66] hover:bg-green-300 active:scale-[0.98] text-[#121212] text-lg sm:text-xl font-black uppercase tracking-wide shadow-lg shadow-[#00FF66]/30 transition-transform touch-manipulation inline-flex items-center justify-center gap-3"
            >
              <Play className="h-6 w-6 fill-[#121212]" aria-hidden />
              Enable Audio &amp; Enter Game
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {audioElement}
      {children}
    </>
  )
}

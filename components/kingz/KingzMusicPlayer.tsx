'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2, Music } from 'lucide-react'
import { MUSIC_PLAYLIST } from '@/lib/kingz/data'

export function KingzMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [trackIndex, setTrackIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [minimized, setMinimized] = useState(false)

  const track = MUSIC_PLAYLIST[trackIndex]

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      void audio.play().catch(() => setPlaying(false))
    } else {
      audio.pause()
    }
  }, [playing, trackIndex])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => {
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100)
    }
    const onEnd = () => {
      setTrackIndex((i) => (i + 1) % MUSIC_PLAYLIST.length)
    }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnd)
    }
  }, [])

  const seek = (pct: number) => {
    const audio = audioRef.current
    if (!audio?.duration) return
    audio.currentTime = (pct / 100) * audio.duration
    setProgress(pct)
  }

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className="fixed bottom-6 left-6 z-50 p-4 rounded-full bg-[#0d0d14] border border-[#D4AF37]/40 text-[#D4AF37] shadow-[0_0_20px_rgba(245,210,118,0.3)] hover:scale-105 transition-transform min-h-[44px] min-w-[44px]"
        aria-label="Open music player"
      >
        <Music className="h-5 w-5" />
      </button>
    )
  }

  return (
    <div
      className="fixed bottom-6 left-6 z-50 w-80 max-w-[calc(100vw-3rem)] kingz-card p-4 shadow-2xl"
      role="region"
      aria-label="Music player"
    >
      <audio ref={audioRef} src={track.src} preload="metadata" />
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-[#D4AF37]" aria-hidden />
          <span className="text-xs uppercase tracking-widest text-[#b0b0b0]">Now Playing</span>
        </div>
        <button
          type="button"
          onClick={() => setMinimized(true)}
          className="text-[#b0b0b0] text-xs hover:text-[#D4AF37] min-h-[44px] px-2"
          aria-label="Minimize player"
        >
          Minimize
        </button>
      </div>
      <p className="kingz-heading text-[#f5f5f5] text-sm truncate">{track.title}</p>
      <p className="text-[#b0b0b0] text-xs mb-3">{track.artist}</p>

      <div
        className="h-1 bg-[#1a1a1a] rounded-full mb-4 cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          seek(((e.clientX - rect.left) / rect.width) * 100)
        }}
        role="slider"
        aria-label="Playback progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') seek(Math.min(100, progress + 5))
          if (e.key === 'ArrowLeft') seek(Math.max(0, progress - 5))
        }}
      >
        <div className="h-full bg-gradient-to-r from-[#D4AF37] to-[#f5d276] rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => setTrackIndex((i) => (i - 1 + MUSIC_PLAYLIST.length) % MUSIC_PLAYLIST.length)}
          className="text-[#D4AF37] p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Previous track"
        >
          <SkipBack className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="p-3 rounded-full bg-[#D4AF37] text-[#050505] hover:scale-105 transition-transform min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
        </button>
        <button
          type="button"
          onClick={() => setTrackIndex((i) => (i + 1) % MUSIC_PLAYLIST.length)}
          className="text-[#D4AF37] p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Next track"
        >
          <SkipForward className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

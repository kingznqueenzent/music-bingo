'use client'

import type { PlaylistSong } from '@/lib/supabase/types'
import { playlistSongLabel } from '@/lib/media-display'

export type HostSongControlsProps = {
  clipSeconds: number
  paused: boolean
  hasCurrentSong: boolean
  hasUpNext: boolean
  playing: boolean
  onTogglePause: () => void
  onNext: () => void
  onSkip: () => void
  onTimerChange: (seconds: number) => void
  className?: string
}

const TIMER_PRESETS = [15, 30, 45] as const

export function HostSongControls({
  clipSeconds,
  paused,
  hasCurrentSong,
  hasUpNext,
  playing,
  onTogglePause,
  onNext,
  onSkip,
  onTimerChange,
  className = '',
}: HostSongControlsProps) {
  return (
    <div className={`rounded-2xl border border-[#00FFFF]/25 bg-[#1E1E1E]/90 p-4 ${className}`}>
      <h3 className="text-sm font-semibold uppercase tracking-widest text-[#00FFFF]/80 mb-3">
        Song Controls
      </h3>
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={onTogglePause}
          disabled={!hasCurrentSong}
          className="rounded-full bg-slate-800 hover:bg-slate-700 disabled:opacity-40 px-4 py-2 text-sm font-semibold text-slate-100 min-h-[44px]"
        >
          {paused ? '▶ Play' : '⏸ Pause'}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!hasUpNext || playing}
          className="rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-4 py-2 text-sm font-semibold text-white min-h-[44px]"
        >
          ⏭ Next Track
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={!hasUpNext || playing}
          className="rounded-full border border-slate-500 hover:border-slate-400 disabled:opacity-40 px-4 py-2 text-sm font-semibold text-slate-200 min-h-[44px]"
        >
          ⏩ Skip
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-slate-400 text-xs uppercase tracking-wide">Clip timer</span>
        {TIMER_PRESETS.map((sec) => (
          <button
            key={sec}
            type="button"
            onClick={() => onTimerChange(sec)}
            className={`rounded-full px-4 py-2 text-sm font-medium min-h-[40px] ${
              clipSeconds === sec
                ? 'bg-[#00FFFF] text-[#121212]'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {sec}s
          </button>
        ))}
      </div>
    </div>
  )
}

export type CalledSongsLogProps = {
  songs: PlaylistSong[]
  className?: string
}

export function CalledSongsLog({ songs, className = '' }: CalledSongsLogProps) {
  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900/70 p-4 ${className}`}>
      <h3 className="text-sm font-semibold uppercase tracking-widest text-emerald-400/90 mb-3">
        Called Songs ({songs.length})
      </h3>
      {songs.length === 0 ? (
        <p className="text-slate-500 text-sm">No tracks called yet — play from Up Next.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto">
          {songs.map((song, i) => (
            <div
              key={song.id}
              className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-2 py-2 text-center"
              title={playlistSongLabel(song)}
            >
              <span className="text-[10px] text-emerald-400/80 font-mono">#{i + 1}</span>
              <p className="text-xs text-emerald-100 line-clamp-2 leading-tight mt-0.5">
                {playlistSongLabel(song)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

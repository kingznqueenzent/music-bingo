'use client'

import { useMemo } from 'react'
import { GameClipPlayer } from '@/components/GameClipPlayer'
import type { PlaylistSong } from '@/lib/supabase/types'

type PlayerSongPlaybackProps = {
  activeSongId: string | null
  song: PlaylistSong | null | undefined
  clipSeconds: number
  crossfadeSeconds?: number
  enabled: boolean
  muted: boolean
}

/** Hidden clip player — mirrors host timing; mounts only when a new song is called. */
export function PlayerSongPlayback({
  activeSongId,
  song,
  clipSeconds,
  crossfadeSeconds = 0,
  enabled,
  muted,
}: PlayerSongPlaybackProps) {
  const playable = useMemo(() => {
    if (!enabled || !activeSongId || !song?.id) return null
    return song
  }, [enabled, activeSongId, song])

  if (!playable) return null

  return (
    <div
      aria-hidden
      className="fixed w-0 h-0 overflow-hidden opacity-0 pointer-events-none -z-10"
      data-player-clip={activeSongId}
    >
      <GameClipPlayer
        key={activeSongId}
        song={playable}
        clipSeconds={clipSeconds}
        crossfadeSeconds={crossfadeSeconds}
        autoPlay={!muted}
        muted={muted}
        variant="hidden"
      />
    </div>
  )
}

'use client'

import { YouTubeClipPlayer } from '@/components/YouTubeClipPlayer'
import { getSongStartTime, type PlayableSongFields } from '@/lib/playlist-song-media'
import type { PlaylistSong } from '@/lib/supabase/types'

export type StageYouTubePlayerProps = {
  song: Pick<PlaylistSong, 'id' | 'youtube_id' | 'title' | 'album_art_url' | 'start_time'>
  clipSeconds: number
  crossfadeSeconds?: number
  autoPlay?: boolean
  paused?: boolean
  className?: string
}

/**
 * Stage-optimized YouTube embed for venue TVs (16:9, dark chrome).
 */
export function YouTubePlayer({
  song,
  clipSeconds,
  crossfadeSeconds = 0,
  autoPlay = true,
  paused = false,
  className = '',
}: StageYouTubePlayerProps) {
  if (!song.youtube_id) return null

  const startSeconds = getSongStartTime(song as unknown as PlayableSongFields)

  return (
    <div className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-[0_0_48px_rgba(0,255,102,0.15)] ${className}`}>
      <YouTubeClipPlayer
        key={song.id}
        videoId={song.youtube_id}
        startSeconds={startSeconds}
        endSeconds={startSeconds + clipSeconds}
        crossfadeSeconds={crossfadeSeconds}
        autoPlay={autoPlay && !paused}
        className="w-full h-full"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#121212] to-transparent" />
    </div>
  )
}

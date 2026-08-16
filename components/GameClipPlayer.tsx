'use client'

import { ClipAudioPlayer, type AudioReadyState } from '@/components/ClipAudioPlayer'
import { YouTubeClipPlayer } from '@/components/YouTubeClipPlayer'
import {
  getClipSourceKind,
  getSongMp3Url,
  getSongStartTime,
  type PlayableSongFields,
} from '@/lib/playlist-song-media'
import type { PlaylistSong } from '@/lib/supabase/types'

type GameClipPlayerProps = {
  song: Pick<PlaylistSong, 'id' | 'youtube_id' | 'audio_url' | 'file_url' | 'source' | 'start_time' | 'title'>
  clipSeconds: number
  crossfadeSeconds?: number
  autoPlay?: boolean
  muted?: boolean
  /** `hidden` — no visible controls (player devices). */
  variant?: 'default' | 'hidden'
  onEnded?: () => void
  onReadyChange?: (state: AudioReadyState, detail?: { bufferedPct: number; latencyMs: number | null }) => void
  className?: string
}

/**
 * Dual-source host/stage player: MP3 from Supabase Storage when audio_url is set,
 * otherwise YouTube embed using youtube_id + start_time.
 */
export function GameClipPlayer({
  song,
  clipSeconds,
  crossfadeSeconds = 0,
  autoPlay = true,
  muted = false,
  variant = 'default',
  onEnded,
  onReadyChange,
  className = '',
}: GameClipPlayerProps) {
  const fields = song as PlayableSongFields
  const kind = getClipSourceKind(fields)
  const startSeconds = getSongStartTime(fields)
  const hidden = variant === 'hidden'

  if (kind === 'mp3') {
    const mp3Url = getSongMp3Url(fields)
    if (!mp3Url) return null
    return (
      <ClipAudioPlayer
        key={song.id}
        src={mp3Url}
        startSeconds={startSeconds}
        clipSeconds={clipSeconds}
        crossfadeSeconds={crossfadeSeconds}
        autoPlay={autoPlay}
        muted={muted}
        showControls={!hidden}
        showStatus={!hidden}
        onEnded={onEnded}
        onReadyChange={onReadyChange}
        className={className}
      />
    )
  }

  if (kind === 'youtube' && song.youtube_id) {
    return (
      <YouTubeClipPlayer
        key={song.id}
        videoId={song.youtube_id}
        startSeconds={startSeconds}
        endSeconds={startSeconds + clipSeconds}
        crossfadeSeconds={crossfadeSeconds}
        autoPlay={autoPlay}
        muted={muted}
        onEnded={onEnded}
        className={className}
      />
    )
  }

  return null
}

export function gameClipSourceLabel(song: PlayableSongFields | null | undefined): 'mp3' | 'youtube' | 'unknown' {
  const kind = getClipSourceKind(song)
  if (kind === 'mp3') return 'mp3'
  if (kind === 'youtube') return 'youtube'
  return 'unknown'
}

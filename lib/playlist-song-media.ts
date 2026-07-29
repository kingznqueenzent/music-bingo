import { isAudioMediaUrl, resolveAudioClipUrl } from '@/lib/audio-clips'
import type { PlaylistSong } from '@/lib/supabase/types'

export type PlayableSongFields = Pick<
  PlaylistSong,
  'youtube_id' | 'audio_url' | 'file_url' | 'source' | 'start_time'
>

export function getSongStartTime(song: PlayableSongFields | null | undefined): number {
  const n = song?.start_time
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0
}

/** Prefer dedicated audio_url, then legacy file_url for local source rows. */
export function getSongMp3Url(song: PlayableSongFields | null | undefined): string | null {
  if (!song) return null
  const fromAudio = resolveAudioClipUrl(song.audio_url)
  if (fromAudio && isAudioMediaUrl(fromAudio)) return fromAudio
  if (song.source === 'local' && song.file_url && isAudioMediaUrl(song.file_url)) {
    return song.file_url
  }
  if (song.file_url && isAudioMediaUrl(song.file_url)) return song.file_url
  return fromAudio
}

export function shouldPlayMp3Clip(song: PlayableSongFields | null | undefined): boolean {
  return !!getSongMp3Url(song)
}

export function shouldPlayYouTubeClip(song: PlayableSongFields | null | undefined): boolean {
  if (!song?.youtube_id?.trim()) return false
  return !shouldPlayMp3Clip(song)
}

export type ClipSourceKind = 'mp3' | 'youtube' | 'none'

export function getClipSourceKind(song: PlayableSongFields | null | undefined): ClipSourceKind {
  if (shouldPlayMp3Clip(song)) return 'mp3'
  if (shouldPlayYouTubeClip(song)) return 'youtube'
  return 'none'
}

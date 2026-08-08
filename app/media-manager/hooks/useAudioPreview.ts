'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CatalogSong } from '../types'

/** Shared HTML5 audio preview — only one track plays at a time. */
export function useAudioPreview() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playbackSongRef = useRef<CatalogSong | null>(null)
  const playingSongIdRef = useRef<string | null>(null)
  const [playingSongId, setPlayingSongId] = useState<string | null>(null)

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'none'
    audioRef.current = audio

    const onTimeUpdate = () => {
      const song = playbackSongRef.current
      if (!song) return
      const clipEnd = (song.start_time_sec || 0) + (song.duration_sec || 35)
      if (audio.currentTime >= clipEnd) {
        audio.pause()
        try {
          audio.currentTime = song.start_time_sec || 0
        } catch {
          // ignore seek errors on emptied src
        }
        playbackSongRef.current = null
        playingSongIdRef.current = null
        setPlayingSongId(null)
      }
    }

    const onEnded = () => {
      playbackSongRef.current = null
      playingSongIdRef.current = null
      setPlayingSongId(null)
    }

    const onError = () => {
      playbackSongRef.current = null
      playingSongIdRef.current = null
      setPlayingSongId(null)
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.pause()
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      audio.removeAttribute('src')
      audio.load()
      audioRef.current = null
      playbackSongRef.current = null
      playingSongIdRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    playbackSongRef.current = null
    playingSongIdRef.current = null
    setPlayingSongId(null)
  }, [])

  const togglePlayback = useCallback(
    async (song: CatalogSong, onError?: (msg: string) => void) => {
      const audio = audioRef.current
      const url = song.media_url?.trim()
      if (!audio || !url) return

      if (playingSongIdRef.current === song.id && !audio.paused) {
        stop()
        return
      }

      audio.pause()
      playbackSongRef.current = null
      playingSongIdRef.current = null
      setPlayingSongId(null)

      audio.src = url
      try {
        audio.currentTime = song.start_time_sec || 0
      } catch {
        // ignore
      }

      try {
        await audio.play()
        playbackSongRef.current = song
        playingSongIdRef.current = song.id
        setPlayingSongId(song.id)
      } catch {
        onError?.('Could not play audio preview for this track.')
        playbackSongRef.current = null
        playingSongIdRef.current = null
        setPlayingSongId(null)
      }
    },
    [stop]
  )

  return { playingSongId, togglePlayback, stop }
}

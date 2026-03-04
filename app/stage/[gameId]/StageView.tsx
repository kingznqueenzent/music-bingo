'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { YouTubeClipPlayer } from '@/components/YouTubeClipPlayer'
import type { Game, PlaylistSong } from '@/lib/supabase/types'

export function StageView({ gameId }: { gameId: string }) {
  const supabase = createClient()
  const [game, setGame] = useState<Game | null>(null)
  const [songs, setSongs] = useState<PlaylistSong[]>([])
  const [currentSong, setCurrentSong] = useState<PlaylistSong | null>(null)

  useEffect(() => {
    async function load() {
      const { data: g } = await supabase.from('games').select('*').eq('id', gameId).single()
      if (g) setGame(g)
      if (g?.playlist_id) {
        const { data: s } = await supabase
          .from('playlist_songs')
          .select('*')
          .eq('playlist_id', g.playlist_id)
          .order('position')
        setSongs(s ?? [])
      }
    }
    load()
  }, [gameId, supabase])

  useEffect(() => {
    const channel = supabase
      .channel(`stage-game-${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => setGame(payload.new as Game)
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, supabase])

  useEffect(() => {
    if (!game?.current_song_id || !songs.length) {
      setCurrentSong(null)
      return
    }
    const song = songs.find((s) => s.id === game.current_song_id) ?? null
    setCurrentSong(song)
  }, [game?.current_song_id, songs])

  const clipSeconds = game?.clip_seconds ?? 20
  const crossfadeSeconds = game?.crossfade_seconds ?? 0
  const isYouTube = currentSong?.source !== 'local' && currentSong?.youtube_id

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-5xl text-center">
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 md:mb-4">
          {currentSong?.title || currentSong?.youtube_id || 'Music Bingo'}
        </h1>
        <p className="text-slate-400 text-lg mb-8">
          {!currentSong ? 'Waiting for next track…' : 'Now playing'}
        </p>

        {isYouTube && (
          <div className="aspect-video max-w-4xl mx-auto rounded-2xl overflow-hidden bg-black shadow-2xl">
            <YouTubeClipPlayer
              videoId={currentSong.youtube_id!}
              startSeconds={0}
              endSeconds={clipSeconds}
              crossfadeSeconds={crossfadeSeconds}
              autoPlay
              className="w-full h-full"
            />
          </div>
        )}

        {currentSong?.source === 'local' && currentSong?.file_url && (
          <div className="aspect-video max-w-4xl mx-auto rounded-2xl overflow-hidden bg-black">
            {currentSong.file_url.match(/\.(mp4|webm)$/i) ? (
              <video
                key={currentSong.id}
                src={currentSong.file_url}
                autoPlay
                controls
                className="w-full h-full object-contain"
              />
            ) : (
              <audio
                key={currentSong.id}
                src={currentSong.file_url}
                autoPlay
                controls
                className="w-full"
              />
            )}
          </div>
        )}

        {!currentSong && (
          <div className="aspect-video max-w-4xl mx-auto rounded-2xl bg-slate-900/50 flex items-center justify-center">
            <p className="text-slate-500 text-xl">No track selected</p>
          </div>
        )}
      </div>
    </div>
  )
}

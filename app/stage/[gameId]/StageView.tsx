'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { YouTubeClipPlayer } from '@/components/YouTubeClipPlayer'
import { SpotifyEmbed } from '@/components/SpotifyEmbed'
import { SourceIndicator } from '@/components/SourceIndicator'
import type { Game, PlaylistSong, LeaderboardEntry } from '@/lib/supabase/types'

type Source = 'youtube' | 'spotify' | 'local'

function getSource(song: PlaylistSong | null): Source {
  if (!song) return 'youtube'
  if (song.source === 'spotify' && song.spotify_track_id) return 'spotify'
  if (song.source === 'local' && song.file_url) return 'local'
  return 'youtube'
}

export function StageView({ gameId }: { gameId: string }) {
  const supabase = useMemo(() => createClient(), [])
  const [game, setGame] = useState<Game | null>(null)
  const [songs, setSongs] = useState<PlaylistSong[]>([])
  const [currentSong, setCurrentSong] = useState<PlaylistSong | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [leaderboardUpdatedAt, setLeaderboardUpdatedAt] = useState<Date | null>(null)

  const fetchLeaderboard = useCallback(async () => {
    const { data } = await supabase
      .from('leaderboard')
      .select('id, player_name, identifier, wins, points, last_played, updated_at')
      .order('points', { ascending: false })
      .limit(10)
    setLeaderboard((data ?? []) as LeaderboardEntry[])
    setLeaderboardUpdatedAt(new Date())
  }, [supabase])

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

  const showLeaderboardOnStage = game?.stage_show_leaderboard ?? false

  useEffect(() => {
    if (!showLeaderboardOnStage) return
    fetchLeaderboard()
  }, [showLeaderboardOnStage, fetchLeaderboard])

  useEffect(() => {
    if (!showLeaderboardOnStage) return
    const channel = supabase
      .channel('leaderboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard' }, () => {
        fetchLeaderboard()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [showLeaderboardOnStage, supabase, fetchLeaderboard])

  const clipSeconds = game?.clip_seconds ?? 20
  const crossfadeSeconds = game?.crossfade_seconds ?? 0
  const isYouTube = currentSong?.source !== 'local' && currentSong?.source !== 'spotify' && currentSong?.youtube_id
  const isSpotify = currentSong?.source === 'spotify' && currentSong?.spotify_track_id
  const isLocal = currentSong?.source === 'local' && currentSong?.file_url
  const nowPlayingLabel = currentSong?.title || currentSong?.youtube_id || currentSong?.spotify_track_id || 'Music Bingo'
  const source = getSource(currentSong)

  /* Full-bleed stage: media layer fills screen; title/artist overlay with Inter; leaderboard as glassmorphism overlay when toggled */
  return (
    <div className="fixed inset-0 min-h-screen w-full bg-[#121212] overflow-hidden">
      {/* Media layer: edge-to-edge */}
      <div className="absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-500">
        {currentSong && (
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between gap-4 px-6 py-4 bg-black/50 backdrop-blur-sm border-b border-white/10">
            <SourceIndicator source={source} />
            <div className="flex-1 min-w-0 text-center">
              <h1
                className="text-3xl md:text-5xl lg:text-6xl font-bold text-white truncate"
                style={{ fontFamily: 'var(--font-inter), sans-serif' }}
              >
                {nowPlayingLabel}
              </h1>
              {currentSong.source === 'spotify' && (
                <p className="text-lg md:text-xl text-cyan-300/90 mt-1" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                  Spotify
                </p>
              )}
            </div>
            <div className="w-8" aria-hidden />
          </div>
        )}

        <div className="flex-1 w-full flex flex-col items-center justify-center p-4 pt-24">
          {currentSong && currentSong.album_art_url && (
            <img
              src={currentSong.album_art_url}
              alt=""
              className="w-32 h-32 md:w-40 md:h-40 rounded-xl object-cover shadow-2xl mb-4 shrink-0"
            />
          )}
          {isYouTube && currentSong && (
            <div className="w-full max-w-6xl aspect-video rounded-xl overflow-hidden bg-black shadow-2xl">
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
          {isSpotify && currentSong && (
            <div className="w-full max-w-2xl">
              <SpotifyEmbed
                trackId={currentSong.spotify_track_id!}
                albumArtUrl={currentSong.album_art_url ?? undefined}
                title={currentSong.title ?? undefined}
              />
            </div>
          )}
          {isLocal && currentSong && (
            <div className="w-full max-w-6xl aspect-video rounded-xl overflow-hidden bg-black">
              {currentSong.file_url!.match(/\.(mp4|webm)$/i) ? (
                <video
                  key={currentSong.id}
                  src={currentSong.file_url!}
                  autoPlay
                  controls
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <audio key={currentSong.id} src={currentSong.file_url!} autoPlay controls className="w-full max-w-xl" />
                </div>
              )}
            </div>
          )}
          {!currentSong && (
            <div className="w-full max-w-6xl aspect-video rounded-xl bg-[#1E1E1E] flex items-center justify-center border border-white/10">
              <p className="text-slate-500 text-xl md:text-2xl" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                No track selected
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard overlay: glassmorphism when toggled */}
      <div
        className={`absolute inset-0 z-20 flex flex-col items-center justify-center p-6 md:p-10 transition-all duration-500 ${
          showLeaderboardOnStage ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(20px)' }}
      >
        <div className="w-full max-w-4xl">
          <h2 className="text-4xl md:text-6xl font-black text-center mb-2 tracking-tight text-[#00FFFF]" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
            LyricGrid
          </h2>
          <p className="text-center text-xl md:text-2xl font-bold mb-8 text-[#00FFFF]/90" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
            LEADERBOARD
          </p>
          <div className="rounded-xl border-2 border-[#00FFFF]/40 overflow-hidden bg-black/30 transition-all duration-300">
            {leaderboard.length === 0 ? (
              <div className="py-16 text-center text-xl md:text-2xl text-[#00FFFF]/70" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                No scores yet
              </div>
            ) : (
              <ul className="divide-y divide-[#00FFFF]/20">
                {leaderboard.map((p, i) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-4 px-6 py-4 md:py-5 transition-colors"
                    style={{ backgroundColor: i % 2 === 0 ? 'rgba(0,255,255,0.06)' : 'transparent' }}
                  >
                    <span className="text-2xl md:text-4xl font-black text-[#00FFFF] shrink-0 w-14" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                      #{i + 1}
                    </span>
                    <span className="text-xl md:text-3xl font-bold text-[#00FFFF] flex-1 truncate" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                      {p.player_name}
                    </span>
                    <span className="text-lg md:text-2xl font-semibold text-[#00FFFF]/95 shrink-0" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                      {p.points} pts
                    </span>
                    <span className="text-base md:text-xl text-[#00FFFF]/80 shrink-0" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                      {p.wins} W
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="text-center text-base md:text-lg text-[#00FFFF]/70 mt-6" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
            Last updated: {leaderboardUpdatedAt ? leaderboardUpdatedAt.toLocaleTimeString() : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}

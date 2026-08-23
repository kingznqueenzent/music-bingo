'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Leaderboard } from '@/components/Leaderboard'
import { CrownedWinnerOverlay } from '@/components/stage/CrownedWinnerOverlay'
import {
  subscribeStageChannel,
  type HostShoutoutPayload,
  type WinnerCrownedPayload,
} from '@/lib/supabase-realtime'
import type { Game, PlaylistSong } from '@/lib/supabase/types'
import { roomCodeFromGame } from '@/types/database-extras'
import { resolveBlindSongParts } from '@/lib/media/blind-song-label'
import { SoundEffectReceiver, useSoundEffectPlayback } from '@/components/sfx/SoundEffectReceiver'

type TickerItem = {
  id: string
  label: string
  kind: 'win' | 'claim'
  at: Date
}

export function GameOverlayView({ gameId }: { gameId: string }) {
  const supabase = useMemo(() => createClient(), [])
  const [game, setGame] = useState<Game | null>(null)
  const [songs, setSongs] = useState<PlaylistSong[]>([])
  const [currentSong, setCurrentSong] = useState<PlaylistSong | null>(null)
  const [crownedWinner, setCrownedWinner] = useState<WinnerCrownedPayload | null>(null)
  const [ticker, setTicker] = useState<TickerItem[]>([])
  const [shoutout, setShoutout] = useState<HostShoutoutPayload | null>(null)
  const { bounce: sfxBounce, onSoundEffect } = useSoundEffectPlayback()
  const songsRef = useRef(songs)
  songsRef.current = songs

  const pushTicker = useCallback((item: Omit<TickerItem, 'id'>) => {
    setTicker((prev) => [
      { ...item, id: `${item.at.getTime()}-${Math.random().toString(36).slice(2, 6)}` },
      ...prev,
    ].slice(0, 8))
  }, [])

  useEffect(() => {
    async function load() {
      const { data: g } = await supabase.from('games').select('*').eq('id', gameId).maybeSingle()
      if (g) setGame(g as Game)
      if (g?.playlist_id) {
        const { data: s } = await supabase
          .from('playlist_songs')
          .select('*')
          .eq('playlist_id', g.playlist_id)
          .order('position')
        setSongs(s ?? [])
      }
      const { data: events } = await supabase
        .from('game_events')
        .select('id, event_type, payload, created_at')
        .eq('game_id', gameId)
        .eq('event_type', 'bingo_win')
        .order('created_at', { ascending: false })
        .limit(6)
      if (events?.length) {
        setTicker(
          events.map((ev) => ({
            id: ev.id,
            kind: 'win' as const,
            label: `${(ev.payload as { playerName?: string }).playerName ?? 'Player'} — BINGO!`,
            at: new Date(ev.created_at),
          }))
        )
      }
    }
    void load()
  }, [gameId, supabase])

  useEffect(() => {
    const channel = subscribeStageChannel(supabase, gameId, {
      onGameUpdate: (row) => setGame(row as unknown as Game),
      onSongChanged: (songId) => {
        if (!songId) {
          setCurrentSong(null)
          return
        }
        setCurrentSong(songsRef.current.find((s) => s.id === songId) ?? null)
      },
      onWinnerCrowned: (payload) => {
        setCrownedWinner(payload)
        pushTicker({
          kind: 'win',
          label: `${payload.playerName} — BINGO WINNER!`,
          at: new Date(),
        })
        window.setTimeout(() => setCrownedWinner(null), 18000)
      },
      onBingoWinner: ({ playerName }) => {
        if (playerName) {
          pushTicker({ kind: 'claim', label: `${playerName} claimed BINGO`, at: new Date() })
        }
      },
      onShoutoutTriggered: (payload) => {
        setShoutout(payload)
        window.setTimeout(() => setShoutout(null), 10000)
      },
      onSoundEffect,
    })

    const eventsChannel = supabase
      .channel(`overlay-events-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_events', filter: `game_id=eq.${gameId}` },
        (payload) => {
          const row = payload.new as { event_type?: string; payload?: { playerName?: string }; created_at?: string }
          if (row.event_type === 'bingo_win') {
            pushTicker({
              kind: 'win',
              label: `${row.payload?.playerName ?? 'Player'} — verified win`,
              at: new Date(row.created_at ?? Date.now()),
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(eventsChannel)
    }
  }, [gameId, supabase, pushTicker, onSoundEffect])

  useEffect(() => {
    if (!game?.current_song_id || !songs.length) {
      setCurrentSong(null)
      return
    }
    setCurrentSong(songs.find((s) => s.id === game.current_song_id) ?? null)
  }, [game?.current_song_id, songs])

  const hideTitles = !!game?.hide_song_titles
  const trackNumber =
    currentSong != null ? songs.findIndex((s) => s.id === currentSong.id) + 1 || null : null
  const nowPlaying = currentSong
    ? resolveBlindSongParts({
        hideTitles,
        trackNumber,
        label: currentSong.title,
        title: currentSong.title,
      })
    : null
  const gameCode = game ? roomCodeFromGame(game) : '——'

  return (
    <main
      className="min-h-0 w-full p-4 md:p-6 bg-transparent pointer-events-none"
      style={{ background: 'transparent' }}
    >
      <SoundEffectReceiver bounce={sfxBounce} variant="overlay" />
      <CrownedWinnerOverlay
        open={!!crownedWinner}
        playerName={crownedWinner?.playerName ?? ''}
        pattern={crownedWinner?.pattern}
        avatarUrl={crownedWinner?.avatarUrl}
        level={crownedWinner?.level}
        levelTitle={crownedWinner?.levelTitle}
        variant="overlay"
        headline="BINGO WINNER!"
      />

      {shoutout ? (
        <div className="pointer-events-none fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-xl w-full px-4">
          <div
            className={`rounded-xl border px-4 py-3 text-center text-sm font-semibold backdrop-blur-md ${
              shoutout.kind === 'warning'
                ? 'border-red-400/50 bg-red-950/70 text-red-100'
                : 'border-[#00FF66]/40 bg-black/55 text-[#00FF66]'
            }`}
          >
            {shoutout.message}
          </div>
        </div>
      ) : null}

      <div className="pointer-events-auto max-w-5xl mx-auto grid gap-4 lg:grid-cols-2 bg-transparent">
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-[#00FF66]/35 bg-black/40 backdrop-blur-xl px-4 py-3">
            <p className="text-xs uppercase tracking-[0.25em] text-[#00FF66]/70 font-bold mb-1">
              Room {gameCode}
            </p>
            {nowPlaying ? (
              <>
                <p className="text-[10px] uppercase tracking-widest text-[#00FF66]/60 mb-0.5">Now playing</p>
                <p className="text-xl md:text-2xl font-black text-white truncate">{nowPlaying.title}</p>
                {nowPlaying.artist ? (
                  <p className="text-sm text-[#00FF66]/80 truncate">{nowPlaying.artist}</p>
                ) : null}
              </>
            ) : (
              <p className="text-lg text-slate-400">Waiting for next track…</p>
            )}
          </div>

          <Leaderboard variant="overlay" limit={10} live title="Leaderboard" />
        </div>

        <div className="rounded-xl border-2 border-[#FFD700]/35 bg-black/40 backdrop-blur-xl p-4">
          <h3 className="text-lg font-black text-[#FFD700] mb-3 flex items-center gap-2">
            <span aria-hidden>🎯</span> Bingo ticker
          </h3>
          {ticker.length === 0 ? (
            <p className="text-slate-500 text-sm">Wins and claims appear here in realtime.</p>
          ) : (
            <ul className="space-y-2">
              {ticker.map((item) => (
                <li
                  key={item.id}
                  className={`text-sm font-semibold px-3 py-2 rounded-lg border ${
                    item.kind === 'win'
                      ? 'border-[#FFD700]/40 bg-[#FFD700]/10 text-[#FFD700]'
                      : 'border-[#00FF66]/30 bg-[#00FF66]/5 text-[#00FF66]'
                  }`}
                >
                  {item.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}

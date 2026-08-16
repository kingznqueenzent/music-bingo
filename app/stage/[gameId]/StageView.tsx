'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GameClipPlayer, gameClipSourceLabel } from '@/components/GameClipPlayer'
import { SourceIndicator } from '@/components/SourceIndicator'
import { YouTubePlayer } from '@/components/stage/YouTubePlayer'
import { AdSlideManager } from '@/components/stage/AdSlideManager'
import { CrownedWinnerOverlay } from '@/components/stage/CrownedWinnerOverlay'
import { PrizeWheelOverlay } from '@/components/stage/PrizeWheelOverlay'
import type { Game, GameSponsor, LeaderboardEntry, PlaylistSong } from '@/lib/supabase/types'
import { useFeatureFlags } from '@/components/FeatureFlagsProvider'
import {
  subscribeStageChannel,
  type HostShoutoutPayload,
  type SpinWheelStartPayload,
  type WinnerCrownedPayload,
} from '@/lib/supabase-realtime'
import { debounce } from '@/lib/debounce'
import { toEvaluatorPattern } from '@/lib/bingo-evaluator'
import { roomCodeFromGame } from '@/types/database-extras'
import { normalizeWinPattern } from '@/lib/bingo-win-pattern'
import { getLevelFromXp } from '@/lib/xp-levels'
import { JoinGameQRCode } from '@/components/JoinGameQRCode'
import { VinylSpinner } from '@/components/stage/VinylSpinner'
import { resolveBlindSongParts } from '@/lib/media/blind-song-label'
import { SoundEffectReceiver, useSoundEffectPlayback } from '@/components/sfx/SoundEffectReceiver'

const WIN_PATTERN_LABELS: Record<string, string> = {
  line: 'Single Line',
  corners: 'Four Corners',
  x: 'X-Pattern',
  blackout: 'Full House',
}

function winPatternLabel(mode: string | null | undefined): string {
  const key = normalizeWinPattern(mode)
  return WIN_PATTERN_LABELS[key] ?? 'Single Line'
}

export function StageView({ gameId }: { gameId: string }) {
  const supabase = useMemo(() => createClient(), [])
  const { isEnabled, loading: flagsLoading } = useFeatureFlags()
  const xpOn = !flagsLoading && isEnabled('xp_and_badges')
  const paidEntryOn = !flagsLoading && isEnabled('paid_entry_games')
  const whiteLabelOn = !flagsLoading && isEnabled('b2b_white_label')
  const sponsorOn = !flagsLoading && isEnabled('sponsor_integration')

  const [game, setGame] = useState<Game | null>(null)
  const [songs, setSongs] = useState<PlaylistSong[]>([])
  const [currentSong, setCurrentSong] = useState<PlaylistSong | null>(null)
  const [sponsors, setSponsors] = useState<GameSponsor[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [leaderboardUpdatedAt, setLeaderboardUpdatedAt] = useState<Date | null>(null)
  const [hostShoutout, setHostShoutout] = useState<HostShoutoutPayload | null>(null)
  const [playbackPaused, setPlaybackPaused] = useState(false)
  const [crownedWinner, setCrownedWinner] = useState<WinnerCrownedPayload | null>(null)
  const [wheelSpin, setWheelSpin] = useState<SpinWheelStartPayload | null>(null)
  const [wheelOpen, setWheelOpen] = useState(false)
  const { bounce: sfxBounce, onSoundEffect } = useSoundEffectPlayback()
  const songsRef = useRef(songs)
  songsRef.current = songs
  const gameModeRef = useRef(game?.mode)
  gameModeRef.current = game?.mode

  const fetchLeaderboard = useCallback(async () => {
    let q = supabase
      .from('leaderboard')
      .select('id, player_name, identifier, wins, points, last_played, updated_at')
      .limit(25)
    q = xpOn ? q.order('points', { ascending: false }) : q.order('wins', { ascending: false })
    const { data } = await q
    setLeaderboard((data ?? []) as LeaderboardEntry[])
    setLeaderboardUpdatedAt(new Date())
  }, [supabase, xpOn])

  const debouncedFetchLeaderboard = useMemo(
    () => debounce(() => void fetchLeaderboard(), 1500),
    [fetchLeaderboard]
  )

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
      if (sponsorOn) {
        const { data: sp } = await supabase
          .from('game_sponsors')
          .select('*')
          .eq('game_id', gameId)
          .order('sort_order')
        setSponsors((sp ?? []) as GameSponsor[])
      }
    }
    void load()
  }, [gameId, supabase, sponsorOn])

  useEffect(() => {
    const channel = subscribeStageChannel(supabase, gameId, {
      onGameUpdate: (row) => setGame(row as unknown as Game),
      onSongChanged: (songId) => {
        if (!songId) {
          setCurrentSong(null)
          return
        }
        const song = songsRef.current.find((s) => s.id === songId) ?? null
        setCurrentSong(song)
      },
      onShoutoutTriggered: (payload) => {
        setHostShoutout(payload)
        window.setTimeout(() => setHostShoutout(null), 12000)
      },
      onWinnerCrowned: (payload) => {
        setCrownedWinner(payload)
        window.setTimeout(() => setCrownedWinner(null), 18000)
      },
      onSpinWheelStart: (payload) => {
        setWheelSpin(payload)
        setWheelOpen(true)
      },
      onSpinWheelStop: () => {
        /* Prize reveal handled inside PrizeWheelOverlay animation */
      },
      onPlaybackState: ({ paused }) => setPlaybackPaused(paused),
      onBingoWinner: ({ playerName, cardId }) => {
        if (playerName) {
          setCrownedWinner({
            playerName,
            cardId,
            pattern: toEvaluatorPattern(gameModeRef.current),
          })
          window.setTimeout(() => setCrownedWinner(null), 14000)
        }
      },
      onSoundEffect,
    })
    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, supabase, onSoundEffect])

  useEffect(() => {
    if (!game?.current_song_id || !songs.length) {
      setCurrentSong(null)
      return
    }
    const song = songs.find((s) => s.id === game.current_song_id) ?? null
    setCurrentSong(song)
  }, [game?.current_song_id, songs])

  const showLeaderboardOnStage = game?.stage_show_leaderboard ?? false
  const venueName = whiteLabelOn ? game?.venue_display_name?.trim() : ''
  const stageLogo = whiteLabelOn ? game?.logo_url : null
  const hideLyricgridStage = whiteLabelOn && !!game?.brand_hide_lyricgrid
  const primaryHex = whiteLabelOn ? game?.brand_primary_hex?.trim() || '#00FF66' : '#00FF66'
  const prizePool = paidEntryOn ? game?.prize_pool_cents ?? 0 : 0
  const gameCode = game ? roomCodeFromGame(game) : '——'
  const patternLabel = winPatternLabel(game?.mode)

  useEffect(() => {
    if (!showLeaderboardOnStage) return
    void fetchLeaderboard()
  }, [showLeaderboardOnStage, fetchLeaderboard])

  useEffect(() => {
    if (!showLeaderboardOnStage) return
    const channel = supabase
      .channel('leaderboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard' }, () => {
        debouncedFetchLeaderboard()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [showLeaderboardOnStage, supabase, debouncedFetchLeaderboard])

  const clipSeconds = game?.clip_seconds ?? 20
  const crossfadeSeconds = game?.crossfade_seconds ?? 0
  const clipKind = gameClipSourceLabel(currentSong)
  const isYouTube = clipKind === 'youtube'
  const isMp3Clip = clipKind === 'mp3'
  const isLegacyLocal = !isMp3Clip && currentSong?.source === 'local' && !!currentSong?.file_url
  const hideTitles = !!game?.hide_song_titles
  const trackNumber =
    currentSong != null
      ? songs.findIndex((s) => s.id === currentSong.id) + 1 || null
      : null
  const nowPlayingParts = currentSong
    ? resolveBlindSongParts({
        hideTitles,
        trackNumber,
        label: currentSong.title,
        title: currentSong.title,
      })
    : { title: 'Music Bingo', artist: null as string | null, full: 'Music Bingo' }
  const source = isMp3Clip || (currentSong?.source === 'local' && currentSong?.file_url) ? 'local' : 'youtube'
  const showAdCarousel = !currentSong || playbackPaused
  const vinylSpinning = !!currentSong && !playbackPaused && !showLeaderboardOnStage

  async function handleWheelSpinComplete(label: string, index: number) {
    if (!wheelSpin) return
    const channel = supabase.channel(`game-${gameId}`)
    await new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'spin_wheel_stop',
            payload: {
              spinId: wheelSpin.spinId,
              targetIndex: index,
              label,
              winnerName: wheelSpin.winnerName,
            },
          })
          resolve()
        }
      })
    })
    supabase.removeChannel(channel)
  }

  return (
    <div className="fixed inset-0 h-dvh w-full bg-[#121212] overflow-hidden text-white transform-gpu">
      <SoundEffectReceiver bounce={sfxBounce} variant="stage" />
      <CrownedWinnerOverlay
        open={!!crownedWinner}
        playerName={crownedWinner?.playerName ?? ''}
        pattern={crownedWinner?.pattern}
        avatarUrl={crownedWinner?.avatarUrl}
        level={crownedWinner?.level}
        levelTitle={crownedWinner?.levelTitle}
        onDismiss={() => setCrownedWinner(null)}
      />

      {wheelSpin && (
        <PrizeWheelOverlay
          open={wheelOpen}
          segments={wheelSpin.segments}
          targetIndex={wheelSpin.targetIndex}
          winnerName={wheelSpin.winnerName}
          onSpinComplete={handleWheelSpinComplete}
          onDismiss={() => {
            setWheelOpen(false)
            setWheelSpin(null)
          }}
        />
      )}

      {hostShoutout ? (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-[90] max-w-3xl w-[92%] rounded-xl border px-8 py-5 text-center shadow-2xl ${
            hostShoutout.kind === 'warning'
              ? 'border-red-500/60 bg-red-950/90 text-red-100'
              : hostShoutout.kind === 'venue'
                ? 'border-[#00FF66]/50 bg-[#1E1E1E]/95 text-[#00FF66]'
                : 'border-amber-500/50 bg-amber-950/90 text-amber-100'
          }`}
        >
          <p className="text-xs uppercase tracking-widest opacity-80 mb-1">Host Shoutout</p>
          <p className="text-xl md:text-2xl font-semibold">{hostShoutout.message}</p>
        </div>
      ) : null}

      {/* Top HUD: join code, venue, pattern */}
      <header className="absolute top-0 inset-x-0 z-30 flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-black/60 backdrop-blur-md border-b border-[#00FF66]/15">
        <div className="flex items-center gap-4 min-w-0">
          {stageLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={stageLogo} alt="" className="h-10 w-auto max-w-[120px] object-contain shrink-0" />
          ) : null}
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#00FF66]/70">Join Code</p>
            <p
              className="text-3xl md:text-5xl font-black tracking-wider text-[#00FF66]"
              style={{ fontFamily: 'var(--font-inter), sans-serif' }}
            >
              {gameCode}
            </p>
          </div>
          {gameCode && gameCode !== '——' ? (
            <JoinGameQRCode gameCode={gameCode} size={88} className="hidden md:flex shrink-0" />
          ) : null}
        </div>
        <div className="text-center flex-1 min-w-0 px-2">
          <p className="text-xs uppercase tracking-widest text-slate-500">Venue</p>
          <p className="text-lg md:text-2xl font-bold truncate" style={{ color: primaryHex }}>
            {hideLyricgridStage && venueName ? venueName : venueName || 'LyricGrid'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs uppercase tracking-widest text-slate-500">Win Pattern</p>
          <p className="text-base md:text-xl font-semibold text-[#FFD700]">{patternLabel}</p>
          {paidEntryOn && prizePool > 0 && (
            <p className="text-sm font-bold text-amber-300 mt-1">Pool ${(prizePool / 100).toFixed(2)}</p>
          )}
        </div>
      </header>

      {/* Media layer */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-24 pb-8 px-4 transition-opacity duration-500">
        {currentSong && (
          <div className="w-full max-w-6xl mb-4 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
            <VinylSpinner
              spinning={vinylSpinning}
              albumArtUrl={hideTitles ? null : currentSong.album_art_url}
              size={140}
              className="md:hidden"
            />
            <div className="hidden md:block">
              <VinylSpinner
                spinning={vinylSpinning}
                albumArtUrl={hideTitles ? null : currentSong.album_art_url}
                size={180}
              />
            </div>
            <div className="flex-1 min-w-0 text-center px-1">
              {hideTitles ? (
                <p className="text-xs uppercase tracking-[0.3em] text-[#00FF66]/80 mb-1 font-semibold">
                  Blind Mode
                </p>
              ) : null}
              <div className="flex items-center justify-center gap-3 mb-1">
                <SourceIndicator source={source} />
              </div>
              <h1
                className="stage-now-playing-title text-white"
                style={{ fontFamily: 'var(--font-inter), sans-serif' }}
                title={nowPlayingParts.full}
              >
                {nowPlayingParts.title}
              </h1>
              {nowPlayingParts.artist ? (
                <p
                  className="mt-1 text-slate-300 font-medium"
                  style={{ fontSize: 'clamp(0.85rem, 0.6rem + 1.4vw, 1.35rem)' }}
                >
                  {nowPlayingParts.artist}
                </p>
              ) : null}
            </div>
          </div>
        )}

        <div key={currentSong?.id ?? 'idle'} className="w-full max-w-6xl flex-1 flex flex-col items-center justify-center animate-stage-song-in">
          {showAdCarousel && sponsorOn ? (
            <AdSlideManager sponsors={sponsors} active className="max-w-6xl" />
          ) : null}

          {!showAdCarousel && isYouTube && currentSong && (
            <YouTubePlayer
              song={currentSong}
              clipSeconds={clipSeconds}
              crossfadeSeconds={crossfadeSeconds}
              autoPlay
              paused={playbackPaused}
              className="max-w-6xl"
            />
          )}

          {!showAdCarousel && isMp3Clip && currentSong && (
            <div className="w-full max-w-6xl aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl flex items-center justify-center p-4 border border-[#00FF66]/10">
              <GameClipPlayer
                song={currentSong}
                clipSeconds={clipSeconds}
                crossfadeSeconds={crossfadeSeconds}
                autoPlay={!playbackPaused}
                className="w-full"
              />
            </div>
          )}

          {!showAdCarousel && isLegacyLocal && currentSong && (
            <div className="w-full max-w-6xl aspect-video rounded-2xl overflow-hidden bg-black border border-[#00FF66]/10">
              {currentSong.file_url!.match(/\.(mp4|webm)$/i) ? (
                <video
                  key={currentSong.id}
                  src={currentSong.file_url!}
                  autoPlay={!playbackPaused}
                  controls
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <audio key={currentSong.id} src={currentSong.file_url!} autoPlay={!playbackPaused} controls className="w-full max-w-xl" />
                </div>
              )}
            </div>
          )}

          {!currentSong && !sponsorOn && (
            <div className="w-full max-w-6xl aspect-video rounded-2xl bg-[#1E1E1E] flex flex-col items-center justify-center border border-[#00FF66]/15">
              <p className="text-[#00FF66]/80 text-2xl md:text-4xl font-bold mb-2">LyricGrid</p>
              <p className="text-slate-500 text-lg">Waiting for host to call a track…</p>
              <p className="text-[#00FF66] text-5xl md:text-7xl font-black mt-6 tracking-widest">{gameCode}</p>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard overlay */}
      <div
        className={`absolute inset-0 z-20 flex flex-col items-center justify-center p-6 md:p-10 pt-28 transition-all duration-500 ${
          showLeaderboardOnStage ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(20px)' }}
      >
        <div className="w-full max-w-4xl">
          <h2
            className="text-4xl md:text-6xl font-black text-center mb-2 tracking-tight"
            style={{ fontFamily: 'var(--font-inter), sans-serif', color: primaryHex }}
          >
            {hideLyricgridStage && venueName ? venueName : 'LyricGrid'}
          </h2>
          <p className="text-center text-xl md:text-2xl font-bold mb-8 text-[#00FF66]/90" style={{ color: primaryHex }}>
            LEADERBOARD
          </p>
          <div className="rounded-xl border-2 border-[#00FF66]/40 overflow-hidden bg-black/30">
            {leaderboard.length === 0 ? (
              <div className="py-16 text-center text-xl text-[#00FF66]/70">No scores yet</div>
            ) : (
              <ul className="divide-y divide-[#00FF66]/20 max-h-[min(60vh,520px)] overflow-y-auto overscroll-contain">
                {leaderboard.map((p, i) => {
                  const lvl = xpOn ? getLevelFromXp(p.points ?? 0) : null
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-4 px-6 py-4 md:py-5"
                      style={{ backgroundColor: i % 2 === 0 ? 'rgba(0,255,102,0.06)' : 'transparent' }}
                    >
                      <span className="text-2xl md:text-4xl font-black text-[#00FF66] shrink-0 w-14">#{i + 1}</span>
                      <span className="text-xl md:text-3xl font-bold text-[#00FF66] flex-1 truncate">{p.player_name}</span>
                      {xpOn && lvl && (
                        <span className="text-sm md:text-lg text-[#FFD700]/90 shrink-0">Lv.{lvl.level}</span>
                      )}
                      {xpOn && (
                        <span className="text-lg md:text-2xl font-semibold text-[#00FF66]/95 shrink-0">{p.points} pts</span>
                      )}
                      <span className="text-base md:text-xl text-[#00FF66]/80 shrink-0">{p.wins} W</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <p className="text-center text-base text-[#00FF66]/70 mt-6">
            Last updated: {leaderboardUpdatedAt ? leaderboardUpdatedAt.toLocaleTimeString() : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}

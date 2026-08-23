/**
 * Supabase Realtime helpers for LyricGrid host ↔ player sync.
 *
 * Schema mapping (legacy Base44 names → LyricGrid tables):
 * - game_sessions  → public.games (+ current_song_id)
 * - called_songs   → public.played_songs
 * - player_boards  → public.cards (+ grid_data marks)
 * - session events → public.game_events
 */
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import type { EvaluatorPattern } from '@/lib/bingo-evaluator'
import type { WheelSegment } from '@/lib/supabase/types'

export type StageEventName =
  | 'SONG_CHANGED'
  | 'SHOUTOUT_TRIGGERED'
  | 'WINNER_CROWNED'
  | 'SPIN_WHEEL_START'
  | 'SPIN_WHEEL_STOP'

export type WinnerCrownedPayload = {
  playerName: string
  cardId?: string
  pattern?: string
  avatarUrl?: string | null
  level?: number
  levelTitle?: string
}

export type SpinWheelStartPayload = {
  segments: WheelSegment[]
  targetIndex: number
  winnerName?: string
  spinId?: string
}

export type SpinWheelStopPayload = {
  spinId?: string
  targetIndex: number
  label: string
  winnerName?: string
}

export type BoardProgressPayload = {
  cardId: string
  markedCount: number
  playerIdentifier?: string | null
}

export type BingoClaimPayload = {
  cardId: string
  playerId?: string | null
  playerName?: string | null
  pattern: EvaluatorPattern | string
  markedPlaylistSongIds: string[]
  /** ISO timestamp when the player claimed (from game_events or client). */
  claimedAt?: string | null
}

export type HostShoutoutPayload = {
  kind: 'custom' | 'venue' | 'warning'
  message: string
  sentAt?: string
}

export type SoundEffectPayload = {
  presetId?: string
  url?: string
  name?: string
  volume?: number
  sentAt?: string
}

export type HostGameRealtimeHandlers = {
  onGameUpdate?: (row: Record<string, unknown>) => void
  onSongCalled?: () => void
  onPlayerJoined?: () => void
  onGameEvent?: (event: { event_type: string; payload: Record<string, unknown> }) => void
  onBingoWinner?: (payload: { playerName?: string; cardId?: string }) => void
  onBingoClaim?: (payload: BingoClaimPayload) => void
  onBoardUpdate?: (payload: BoardProgressPayload) => void
  onHostShoutout?: (payload: HostShoutoutPayload) => void
}

export type StageRealtimeHandlers = {
  onGameUpdate?: (row: Record<string, unknown>) => void
  onSongChanged?: (songId: string | null) => void
  onShoutoutTriggered?: (payload: HostShoutoutPayload) => void
  onSoundEffect?: (payload: SoundEffectPayload) => void
  onWinnerCrowned?: (payload: WinnerCrownedPayload) => void
  onSpinWheelStart?: (payload: SpinWheelStartPayload) => void
  onSpinWheelStop?: (payload: SpinWheelStopPayload) => void
  onPlaybackState?: (payload: { paused: boolean }) => void
  onBingoWinner?: (payload: { playerName?: string; cardId?: string }) => void
}

export function gameChannelName(gameId: string): string {
  return `game-${gameId}`
}

export function playChannelName(gameId: string): string {
  return `play-${gameId}`
}

/** Subscribe host (or stage) to game session + boards + called songs. */
export function subscribeHostGameChannel(
  supabase: SupabaseClient,
  gameId: string,
  handlers: HostGameRealtimeHandlers
): RealtimeChannel {
  const channel = supabase
    .channel(gameChannelName(gameId))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
      (payload) => handlers.onGameUpdate?.(payload.new as Record<string, unknown>)
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'played_songs', filter: `game_id=eq.${gameId}` },
      () => handlers.onSongCalled?.()
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'played_songs', filter: `game_id=eq.${gameId}` },
      () => handlers.onSongCalled?.()
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'cards', filter: `game_id=eq.${gameId}` },
      () => handlers.onPlayerJoined?.()
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'game_events', filter: `game_id=eq.${gameId}` },
      (payload) => {
        const row = payload.new as {
          event_type?: string
          payload?: Record<string, unknown>
        }
        if (!row.event_type) return
        handlers.onGameEvent?.({ event_type: row.event_type, payload: row.payload ?? {} })
        if (row.event_type === 'bingo_win') {
          const p = row.payload ?? {}
          handlers.onBingoWinner?.({
            playerName: p.playerName as string | undefined,
            cardId: p.cardId as string | undefined,
          })
        }
        if (row.event_type === 'bingo_claim') {
          const p = row.payload ?? {}
          const cardId = p.cardId as string | undefined
          if (cardId) {
            handlers.onBingoClaim?.({
              cardId,
              playerId: (p.playerId as string | null | undefined) ?? null,
              playerName: (p.playerName as string | null | undefined) ?? null,
              pattern: (p.pattern as string) ?? 'line',
              markedPlaylistSongIds: Array.isArray(p.markedPlaylistSongIds)
                ? (p.markedPlaylistSongIds as string[])
                : [],
              claimedAt:
                (p.claimedAt as string | null | undefined) ??
                ((payload.new as { created_at?: string }).created_at ?? null),
            })
          }
        }
        if (row.event_type === 'board_update') {
          const p = row.payload ?? {}
          const cardId = p.cardId as string | undefined
          const markedCount =
            typeof p.markedCount === 'number'
              ? p.markedCount
              : Array.isArray(p.markedPlaylistSongIds)
                ? p.markedPlaylistSongIds.length
                : undefined
          if (cardId && markedCount != null) {
            handlers.onBoardUpdate?.({
              cardId,
              markedCount,
              playerIdentifier: p.playerIdentifier as string | null | undefined,
            })
          }
        }
      }
    )
    .on('broadcast', { event: 'board_progress' }, (msg) => {
      const p = (msg as { payload?: BoardProgressPayload }).payload
      if (p?.cardId && typeof p.markedCount === 'number') handlers.onBoardUpdate?.(p)
    })
    .on('broadcast', { event: 'bingo_winner' }, (msg) => {
      const p = (msg as { payload?: { playerName?: string; cardId?: string } }).payload
      handlers.onBingoWinner?.({ playerName: p?.playerName, cardId: p?.cardId })
    })
    .on('broadcast', { event: 'bingo_claim' }, (msg) => {
      const p = (msg as { payload?: BingoClaimPayload }).payload
      if (p?.cardId) handlers.onBingoClaim?.(p)
    })
    .on('broadcast', { event: 'host_shoutout' }, (msg) => {
      const p = (msg as { payload?: HostShoutoutPayload }).payload
      if (p?.message) handlers.onHostShoutout?.(p)
    })

  channel.subscribe()
  return channel
}

export async function broadcastBoardProgress(
  supabase: SupabaseClient,
  gameId: string,
  payload: BoardProgressPayload
): Promise<void> {
  const channel = supabase.channel(gameChannelName(gameId))
  await new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({ type: 'broadcast', event: 'board_progress', payload })
        resolve()
      }
    })
  })
  supabase.removeChannel(channel)
}

export async function broadcastBingoClaim(
  supabase: SupabaseClient,
  gameId: string,
  payload: BingoClaimPayload
): Promise<void> {
  const channel = supabase.channel(gameChannelName(gameId))
  await new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({ type: 'broadcast', event: 'bingo_claim', payload })
        resolve()
      }
    })
  })
  supabase.removeChannel(channel)
}

export type BingoClaimDecisionPayload = {
  cardId: string
  status: 'approved' | 'rejected'
  playerName?: string | null
  reason?: string | null
}

/** Notify the player card that the host approved or rejected a CALL BINGO claim. */
export async function broadcastBingoClaimDecision(
  supabase: SupabaseClient,
  gameId: string,
  payload: BingoClaimDecisionPayload
): Promise<void> {
  await broadcastOnChannel(supabase, playChannelName(gameId), 'bingo_claim_decision', payload)
  const decisionEvent = payload.status === 'approved' ? 'bingo_approved' : 'bingo_rejected'
  await broadcastOnChannel(supabase, playChannelName(gameId), decisionEvent, payload)
  if (payload.status === 'approved') {
    await broadcastOnChannel(supabase, playChannelName(gameId), 'bingo_verified', {
      cardId: payload.cardId,
    })
  }
}

async function broadcastOnChannel(
  supabase: SupabaseClient,
  channelName: string,
  event: string,
  payload: object
): Promise<void> {
  const channel = supabase.channel(channelName)
  await new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({ type: 'broadcast', event, payload })
        resolve()
      }
    })
  })
  supabase.removeChannel(channel)
}

export async function broadcastHostShoutout(
  supabase: SupabaseClient,
  gameId: string,
  payload: HostShoutoutPayload
): Promise<void> {
  const body = { ...payload, sentAt: payload.sentAt ?? new Date().toISOString() }
  // Stage listens on game-*; player cards listen on play-*
  await Promise.all([
    broadcastOnChannel(supabase, gameChannelName(gameId), 'host_shoutout', body),
    broadcastOnChannel(supabase, playChannelName(gameId), 'host_shoutout', body),
  ])
}

export async function broadcastSoundEffect(
  supabase: SupabaseClient,
  gameId: string,
  payload: SoundEffectPayload
): Promise<void> {
  const body = { ...payload, sentAt: payload.sentAt ?? new Date().toISOString() }
  await broadcastOnChannel(supabase, gameChannelName(gameId), 'sound_effect', body)
}

export async function broadcastPlaybackState(
  supabase: SupabaseClient,
  gameId: string,
  payload: { paused: boolean }
): Promise<void> {
  const channel = supabase.channel(gameChannelName(gameId))
  await new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({ type: 'broadcast', event: 'playback_state', payload })
        resolve()
      }
    })
  })
  supabase.removeChannel(channel)
}

/** Stage broadcast view — game session, song changes, shoutouts, winner & wheel events. */
export function subscribeStageChannel(
  supabase: SupabaseClient,
  gameId: string,
  handlers: StageRealtimeHandlers
): RealtimeChannel {
  const channel = supabase
    .channel(gameChannelName(gameId))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
      (payload) => {
        const row = payload.new as Record<string, unknown>
        handlers.onGameUpdate?.(row)
        const songId = row.current_song_id as string | null | undefined
        handlers.onSongChanged?.(songId ?? null)
      }
    )
    .on('broadcast', { event: 'host_shoutout' }, (msg) => {
      const p = (msg as { payload?: HostShoutoutPayload }).payload
      if (p?.message) handlers.onShoutoutTriggered?.(p)
    })
    .on('broadcast', { event: 'sound_effect' }, (msg) => {
      const p = (msg as { payload?: SoundEffectPayload }).payload
      if (p && (p.presetId || p.url)) handlers.onSoundEffect?.(p)
    })
    .on('broadcast', { event: 'winner_crowned' }, (msg) => {
      const p = (msg as { payload?: WinnerCrownedPayload }).payload
      if (p?.playerName) handlers.onWinnerCrowned?.(p)
    })
    .on('broadcast', { event: 'spin_wheel_start' }, (msg) => {
      const p = (msg as { payload?: SpinWheelStartPayload }).payload
      if (p?.segments?.length) handlers.onSpinWheelStart?.(p)
    })
    .on('broadcast', { event: 'spin_wheel_stop' }, (msg) => {
      const p = (msg as { payload?: SpinWheelStopPayload }).payload
      if (p?.label) handlers.onSpinWheelStop?.(p)
    })
    .on('broadcast', { event: 'playback_state' }, (msg) => {
      const p = (msg as { payload?: { paused?: boolean } }).payload
      if (p && typeof p.paused === 'boolean') handlers.onPlaybackState?.(p as { paused: boolean })
    })
    .on('broadcast', { event: 'bingo_winner' }, (msg) => {
      const p = (msg as { payload?: { playerName?: string; cardId?: string } }).payload
      handlers.onBingoWinner?.({ playerName: p?.playerName, cardId: p?.cardId })
    })

  channel.subscribe()
  return channel
}

async function sendGameBroadcast(
  supabase: SupabaseClient,
  gameId: string,
  event: string,
  payload: object
): Promise<void> {
  const channel = supabase.channel(gameChannelName(gameId))
  await new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({ type: 'broadcast', event, payload })
        resolve()
      }
    })
  })
  supabase.removeChannel(channel)
}

export async function broadcastWinnerCrowned(
  supabase: SupabaseClient,
  gameId: string,
  payload: WinnerCrownedPayload
): Promise<void> {
  await sendGameBroadcast(supabase, gameId, 'winner_crowned', payload)
}

export async function broadcastSpinWheelStart(
  supabase: SupabaseClient,
  gameId: string,
  payload: SpinWheelStartPayload
): Promise<void> {
  await sendGameBroadcast(supabase, gameId, 'spin_wheel_start', payload)
}

export async function broadcastSpinWheelStop(
  supabase: SupabaseClient,
  gameId: string,
  payload: SpinWheelStopPayload
): Promise<void> {
  await sendGameBroadcast(supabase, gameId, 'spin_wheel_stop', payload)
}

export type GameEndedPayload = {
  reason?: 'host_ended' | 'already_ended' | 'new_game' | string
  newGameId?: string
  roomCode?: string
  sentAt?: string
}

export type NewGameStartedPayload = {
  newGameId: string
  roomCode: string
  reusedSameGame?: boolean
  sentAt?: string
}

/** Notify stage + players that the session ended (also mirrored via games.status realtime). */
export async function broadcastGameEnded(
  supabase: SupabaseClient,
  gameId: string,
  payload: GameEndedPayload = {}
): Promise<void> {
  const body = { ...payload, sentAt: payload.sentAt ?? new Date().toISOString() }
  await Promise.all([
    broadcastOnChannel(supabase, gameChannelName(gameId), 'game_ended', body),
    broadcastOnChannel(supabase, playChannelName(gameId), 'game_ended', body),
  ])
}

/** Tell players on the old session that a replacement lobby is ready. */
export async function broadcastNewGameStarted(
  supabase: SupabaseClient,
  previousGameId: string,
  payload: NewGameStartedPayload
): Promise<void> {
  const body = { ...payload, sentAt: new Date().toISOString() }
  await Promise.all([
    broadcastOnChannel(supabase, gameChannelName(previousGameId), 'new_game_started', body),
    broadcastOnChannel(supabase, playChannelName(previousGameId), 'new_game_started', body),
  ])
}

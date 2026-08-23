/**
 * Base44 gameplay replacements — Supabase-backed session helpers.
 * Maps legacy function names to native queries on `games`, `players`, `cards`, `game_events`, `leaderboard`.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Json } from '@/types/database.types'
import { roomCodeLookupFilter } from '@/lib/game-room-code'
import { createPlayerBingoCard } from '@/lib/bingo/create-player-card'
import { applyWinClaimProgress } from '@/lib/player-progress'
import { roomCodeFromGame } from '@/types/database-extras'

export type GameByCode = {
  id: string
  code: string
  room_code?: string | null
  status: string | null
  playlist_id: string | null
  grid_size: number | null
  mode: string | null
  current_song_id: string | null
  theme_id: string | null
  tier: string | null
  venue_display_name: string | null
  logo_url: string | null
}

export type GameEventType =
  | 'bingo_win'
  | 'prize_claim'
  | 'board_update'
  | 'bingo_claim'
  | 'bingo_approved'
  | 'bingo_rejected'

/** Base44 getGameByCode — load active session by room code. */
export async function getGameByCode(
  supabase: SupabaseClient,
  code: string
): Promise<{ game: GameByCode | null; error?: string }> {
  const normalized = code.trim().toUpperCase()
  if (!normalized) return { game: null, error: 'Game code is required.' }

  const { data, error } = await supabase
    .from('games')
    .select(
      'id, code, room_code, status, playlist_id, grid_size, mode, current_song_id, theme_id, tier, venue_display_name, logo_url'
    )
    .or(roomCodeLookupFilter(normalized))
    .maybeSingle()

  if (error) return { game: null, error: error.message }
  if (!data) return { game: null }
  return {
    game: {
      ...(data as GameByCode),
      code: roomCodeFromGame(data as { code?: string | null; room_code?: string | null }),
    },
  }
}

/** Base44 joinGame — register player + deal card (Choice A + legacy card_cells). */
export async function joinGame(
  supabase: SupabaseClient,
  gameCode: string,
  playerName: string,
  playerIdentifier?: string | null,
  resumeCardId?: string | null,
  authUserId?: string | null
) {
  return createPlayerBingoCard(supabase, {
    gameCode,
    username: playerName.trim(),
    playerIdentifier: playerIdentifier?.trim() || null,
    resumeCardId,
    authUserId,
  })
}

/** Base44 updateBoard — persist tile marks on cards.grid_data and emit board_update event. */
export async function updateBoard(
  supabase: SupabaseClient,
  input: {
    gameId: string
    cardId: string
    markedPlaylistSongIds: string[]
    playerIdentifier?: string | null
  }
): Promise<{ ok: boolean; error?: string }> {
  const { gameId, cardId, markedPlaylistSongIds } = input
  const markSet = new Set(markedPlaylistSongIds)

  const { data: card, error: cardError } = await supabase
    .from('cards')
    .select('id, game_id, grid_data')
    .eq('id', cardId)
    .eq('game_id', gameId)
    .single()

  if (cardError || !card) return { ok: false, error: 'Card not found.' }

  const grid = Array.isArray(card.grid_data) ? [...card.grid_data] : []
  let updated = false

  if (grid.length > 0) {
    const nextGrid = grid.map((cell) => {
      const c = cell as {
        position?: number
        track_id?: string
        playlist_song_id?: string
        title?: string
        artist?: string
        marked?: boolean
      }
      const songId = c.playlist_song_id
      if (!songId) return c
      const marked = markSet.has(songId)
      if (c.marked !== marked) updated = true
      return { ...c, marked }
    })

    if (updated) {
      const { error: updateError } = await supabase
        .from('cards')
        .update({ grid_data: nextGrid })
        .eq('id', cardId)
      if (updateError) return { ok: false, error: updateError.message }
    }
  }

  const { error: eventError } = await supabase.from('game_events').insert({
    game_id: gameId,
    event_type: 'board_update',
    payload: {
      cardId,
      markedPlaylistSongIds,
      playerIdentifier: input.playerIdentifier ?? null,
      updatedAt: new Date().toISOString(),
    } satisfies Json,
  })

  if (eventError && !/game_events|schema cache|does not exist/i.test(eventError.message)) {
    return { ok: false, error: eventError.message }
  }

  return { ok: true }
}

/** Base44 notifyHostWin — insert realtime event for host dashboard. */
export async function notifyHostWin(
  supabase: SupabaseClient,
  gameId: string,
  payload: { cardId: string; playerName: string; playerIdentifier?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('game_events').insert({
    game_id: gameId,
    event_type: 'bingo_win',
    payload: payload as unknown as Json,
  })
  if (error) {
    if (/game_events|schema cache|does not exist/i.test(error.message)) return { ok: true }
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

/** Persist a player CALL BINGO! claim for host alert (before / alongside verify). */
export async function notifyHostBingoClaim(
  supabase: SupabaseClient,
  gameId: string,
  payload: {
    cardId: string
    playerName?: string | null
    playerIdentifier?: string | null
    pattern?: string | null
    markedPlaylistSongIds?: string[]
  }
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('game_events').insert({
    game_id: gameId,
    event_type: 'bingo_claim',
    payload: {
      cardId: payload.cardId,
      playerId: payload.playerIdentifier ?? null,
      playerName: payload.playerName ?? null,
      pattern: payload.pattern ?? 'line',
      markedPlaylistSongIds: payload.markedPlaylistSongIds ?? [],
      claimedAt: new Date().toISOString(),
    } satisfies Json,
  })
  if (error) {
    // Older DBs without bingo_claim in the check constraint — still ok; realtime broadcast covers host.
    if (
      /game_events|schema cache|does not exist|bingo_claim|check constraint|violates/i.test(
        error.message
      )
    ) {
      return { ok: true }
    }
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

/** Persist host approve/reject of a CALL BINGO claim for audit + realtime. */
export async function recordBingoClaimDecision(
  supabase: SupabaseClient,
  gameId: string,
  input: {
    status: 'approved' | 'rejected'
    cardId: string
    playerName?: string | null
    playerIdentifier?: string | null
    reason?: string | null
    pattern?: string | null
  }
): Promise<{ ok: boolean; error?: string }> {
  const event_type: GameEventType =
    input.status === 'approved' ? 'bingo_approved' : 'bingo_rejected'
  const { error } = await supabase.from('game_events').insert({
    game_id: gameId,
    event_type,
    payload: {
      cardId: input.cardId,
      playerId: input.playerIdentifier ?? null,
      playerName: input.playerName ?? null,
      reason: input.reason ?? null,
      pattern: input.pattern ?? null,
      decidedAt: new Date().toISOString(),
    } satisfies Json,
  })
  if (error) {
    if (
      /game_events|schema cache|does not exist|bingo_approved|bingo_rejected|check constraint|violates/i.test(
        error.message
      )
    ) {
      return { ok: true }
    }
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

/** Base44 notifyHostPrize — prize redemption alert for host. */
export async function notifyHostPrize(
  supabase: SupabaseClient,
  gameId: string,
  payload: {
    cardId: string
    playerName: string
    prizeId?: string | null
    claimEmail?: string | null
  }
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('game_events').insert({
    game_id: gameId,
    event_type: 'prize_claim',
    payload: payload as unknown as Json,
  })
  if (error) {
    if (/game_events|schema cache|does not exist/i.test(error.message)) return { ok: true }
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

/** Base44 updateLeaderboardStats — record win claim on leaderboard aggregate. */
export async function updateLeaderboardStats(
  supabase: SupabaseClient,
  input: { gameId: string; cardId: string; playerName: string }
) {
  return applyWinClaimProgress(supabase, input)
}

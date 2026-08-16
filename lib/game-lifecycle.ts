import type { SupabaseClient } from '@supabase/supabase-js'
import { isLyricGridLive } from '@/lib/default-room-code'
import { insertGameOrReuseLobby, roomCodeFromGame } from '@/lib/game-room-code'
import {
  broadcastGameEnded,
  broadcastNewGameStarted,
} from '@/lib/supabase-realtime'

export type EndGameResult =
  | { ok: true }
  | { ok: false; error: string }

export type StartNewGameResult =
  | {
      ok: true
      gameId: string
      roomCode: string
      reusedSameGame: boolean
    }
  | { ok: false; error: string }

/** Soft-close a live session: status=ended, clear now-playing, stop auto-play. */
export async function endGameSession(
  supabase: SupabaseClient,
  gameId: string
): Promise<EndGameResult> {
  const { data: game, error: fetchError } = await supabase
    .from('games')
    .select('id, status')
    .eq('id', gameId)
    .maybeSingle()

  if (fetchError) return { ok: false, error: fetchError.message }
  if (!game) return { ok: false, error: 'Game not found' }

  if (game.status === 'ended') {
    await broadcastGameEnded(supabase, gameId, { reason: 'already_ended' })
    return { ok: true }
  }

  const { error } = await supabase
    .from('games')
    .update({
      status: 'ended',
      current_song_id: null,
      auto_play_enabled: false,
    })
    .eq('id', gameId)

  if (error) return { ok: false, error: error.message }

  await broadcastGameEnded(supabase, gameId, { reason: 'host_ended' })
  return { ok: true }
}

type SourceGameRow = {
  id: string
  status?: string | null
  playlist_id: string
  theme_id?: string | null
  host_id?: string | null
  mode?: string | null
  grid_size?: number | null
  tier?: string | null
  clip_seconds?: number | null
  crossfade_seconds?: number | null
  game_pace_seconds?: number | null
  hide_song_titles?: boolean | null
  stage_show_leaderboard?: boolean | null
  logo_url?: string | null
  venue_display_name?: string | null
  brand_primary_hex?: string | null
  brand_accent_hex?: string | null
  brand_hide_lyricgrid?: boolean | null
  entry_fee_cents?: number | null
  wheel_segments?: unknown
  chat_profanity_filter_enabled?: boolean | null
  code?: string | null
  room_code?: string | null
}

async function copyPlaylistSongs(
  supabase: SupabaseClient,
  sourcePlaylistId: string,
  targetPlaylistId: string
): Promise<{ error?: string }> {
  if (!sourcePlaylistId) return { error: 'Source game has no playlist.' }

  const { data: rows, error } = await supabase
    .from('playlist_songs')
    .select('*')
    .eq('playlist_id', sourcePlaylistId)
    .order('position', { ascending: true })

  if (error) return { error: error.message }
  if (!rows?.length) return { error: 'Source game has no playlist songs to copy.' }

  if (sourcePlaylistId === targetPlaylistId) {
    // Same playlist shared (unlikely on live new-game) — nothing to copy.
    return {}
  }

  const inserts = rows.map((row, index) => {
    const r = row as Record<string, unknown>
    const {
      id: _id,
      created_at: _createdAt,
      playlist_id: _playlistId,
      ...rest
    } = r
    return {
      ...rest,
      playlist_id: targetPlaylistId,
      position: typeof r.position === 'number' ? r.position : index,
    }
  })

  const { error: insertError } = await supabase.from('playlist_songs').insert(inserts)
  if (insertError) return { error: insertError.message }
  return {}
}

/**
 * Start a fresh session from an existing game:
 * - Live: create a new game + copy playlist, end the old one, notify players.
 * - Pre-launch (LYRIC): reset the same room (clear cards/played, back to lobby).
 */
export async function startNewGameFromExisting(
  supabase: SupabaseClient,
  sourceGameId: string
): Promise<StartNewGameResult> {
  const { data: source, error: sourceError } = await supabase
    .from('games')
    .select('*')
    .eq('id', sourceGameId)
    .maybeSingle()

  if (sourceError) return { ok: false, error: sourceError.message }
  if (!source) return { ok: false, error: 'Game not found' }

  const src = source as SourceGameRow
  if (!src.playlist_id) return { ok: false, error: 'Source game has no playlist' }

  if (!isLyricGridLive()) {
    await supabase.from('played_songs').delete().eq('game_id', sourceGameId)
    await supabase.from('cards').delete().eq('game_id', sourceGameId)

    const { error: resetError } = await supabase
      .from('games')
      .update({
        status: 'lobby',
        current_song_id: null,
        auto_play_enabled: false,
        round: 1,
      })
      .eq('id', sourceGameId)

    if (resetError) return { ok: false, error: resetError.message }

    const roomCode = roomCodeFromGame(src) || 'LYRIC'
    await broadcastNewGameStarted(supabase, sourceGameId, {
      newGameId: sourceGameId,
      roomCode,
      reusedSameGame: true,
    })

    return {
      ok: true,
      gameId: sourceGameId,
      roomCode,
      reusedSameGame: true,
    }
  }

  // Live: always mint a new game so room codes and cards stay clean.
  const playlistInsert = await supabase
    .from('playlists')
    .insert({ name: `Game ${new Date().toISOString().slice(0, 16)}` })
    .select('id')
    .single()

  if (playlistInsert.error || !playlistInsert.data?.id) {
    return {
      ok: false,
      error: playlistInsert.error?.message ?? 'Could not create playlist for new game',
    }
  }

  const newPlaylistId = String(playlistInsert.data.id)
  const copy = await copyPlaylistSongs(supabase, String(src.playlist_id), newPlaylistId)
  if (copy.error) {
    await supabase.from('playlists').delete().eq('id', newPlaylistId)
    return { ok: false, error: copy.error }
  }

  const payload: Record<string, unknown> = {
    status: 'lobby',
    current_song_id: null,
    auto_play_enabled: false,
    playlist_id: newPlaylistId,
    theme_id: src.theme_id ?? null,
    host_id: src.host_id ?? null,
    mode: src.mode ?? 'line',
    grid_size: src.grid_size ?? 5,
    tier: src.tier ?? 'pro',
    clip_seconds: src.clip_seconds ?? 30,
    crossfade_seconds: src.crossfade_seconds ?? 0,
    game_pace_seconds: src.game_pace_seconds ?? 35,
    hide_song_titles: !!src.hide_song_titles,
    stage_show_leaderboard: src.stage_show_leaderboard ?? true,
    logo_url: src.logo_url ?? null,
    venue_display_name: src.venue_display_name ?? null,
    brand_primary_hex: src.brand_primary_hex ?? null,
    brand_accent_hex: src.brand_accent_hex ?? null,
    brand_hide_lyricgrid: !!src.brand_hide_lyricgrid,
    entry_fee_cents: src.entry_fee_cents ?? 0,
    wheel_segments: src.wheel_segments ?? null,
    chat_profanity_filter_enabled: src.chat_profanity_filter_enabled ?? true,
    round: 1,
  }

  const roomResult = await insertGameOrReuseLobby(supabase, payload)
  if (roomResult.error || !roomResult.game) {
    await supabase.from('playlist_songs').delete().eq('playlist_id', newPlaylistId)
    await supabase.from('playlists').delete().eq('id', newPlaylistId)
    return { ok: false, error: roomResult.error ?? 'Could not create new game' }
  }

  const newGameId = String(roomResult.game.id)

  if ((src.status ?? '') !== 'ended') {
    await supabase
      .from('games')
      .update({
        status: 'ended',
        current_song_id: null,
        auto_play_enabled: false,
      })
      .eq('id', sourceGameId)
  }

  const roomCode = roomResult.code
  await broadcastNewGameStarted(supabase, sourceGameId, {
    newGameId,
    roomCode,
    reusedSameGame: false,
  })
  await broadcastGameEnded(supabase, sourceGameId, {
    reason: 'new_game',
    newGameId,
    roomCode,
  })

  return {
    ok: true,
    gameId: newGameId,
    roomCode,
    reusedSameGame: false,
  }
}

import type { SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_ROOM_CODE, generateRoomCode, isLyricGridLive } from '@/lib/default-room-code'

type GameRow = { id: string; code: string; [key: string]: unknown }

export type InsertGameOrReuseResult =
  | { game: GameRow; code: string; reused: boolean; error?: undefined }
  | { game?: undefined; code?: undefined; reused?: undefined; error: string }

const UNIQUE_VIOLATION = '23505'
const MAX_CODE_ATTEMPTS = 8

/** Returns the active LYRIC lobby game, if one exists. */
export async function findLyricLobbyGame(supabase: SupabaseClient): Promise<GameRow | null> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('code', DEFAULT_ROOM_CODE)
    .maybeSingle()

  if (error || !data) return null
  return data as GameRow
}

/** Reset a reused LYRIC room with a fresh playlist and lobby status. */
async function refreshLyricLobbyGame(
  supabase: SupabaseClient,
  gameId: string,
  payload: Record<string, unknown>
): Promise<InsertGameOrReuseResult> {
  await supabase.from('played_songs').delete().eq('game_id', gameId)

  const { data: game, error } = await supabase
    .from('games')
    .update({
      ...payload,
      status: 'lobby',
      current_song_id: null,
      code: DEFAULT_ROOM_CODE,
    })
    .eq('id', gameId)
    .select()
    .single()

  if (error) return { error: error.message }
  if (!game) return { error: 'Failed to refresh game' }
  return { game: game as GameRow, code: DEFAULT_ROOM_CODE, reused: true }
}

async function insertGameWithGeneratedCode(
  supabase: SupabaseClient,
  payload: Record<string, unknown>
): Promise<InsertGameOrReuseResult> {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateRoomCode()
    const { data: game, error } = await supabase
      .from('games')
      .insert({ ...payload, code })
      .select()
      .single()

    if (!error && game) {
      return { game: game as GameRow, code, reused: false }
    }

    if (error?.code !== UNIQUE_VIOLATION) {
      return { error: error?.message ?? 'Failed to create game' }
    }
  }

  return { error: 'Failed to generate unique room code' }
}

/** Pre-launch: reuse shared LYRIC lobby. Live: insert with a unique random code. */
export async function insertGameOrReuseLobby(
  supabase: SupabaseClient,
  payload: Record<string, unknown>
): Promise<InsertGameOrReuseResult> {
  if (isLyricGridLive()) {
    return insertGameWithGeneratedCode(supabase, payload)
  }

  const existing = await findLyricLobbyGame(supabase)
  if (existing) {
    return refreshLyricLobbyGame(supabase, String(existing.id), payload)
  }

  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({ ...payload, code: DEFAULT_ROOM_CODE })
    .select()
    .single()

  if (gameError) {
    if (gameError.code === UNIQUE_VIOLATION) {
      const raced = await findLyricLobbyGame(supabase)
      if (raced) return refreshLyricLobbyGame(supabase, String(raced.id), payload)
    }
    return { error: gameError.message }
  }

  if (!game) return { error: 'Failed to create game' }
  return { game: game as GameRow, code: DEFAULT_ROOM_CODE, reused: false }
}

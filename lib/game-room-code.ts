import type { SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_ROOM_CODE, generateRoomCode, isLyricGridLive } from '@/lib/default-room-code'
import { roomCodeFromGame } from '@/types/database-extras'

type GameRow = { id: string; code?: string | null; room_code?: string | null; [key: string]: unknown }

export type InsertGameOrReuseResult =
  | { game: GameRow; code: string; reused: boolean; error?: undefined }
  | { game?: undefined; code?: undefined; reused?: undefined; error: string }

const UNIQUE_VIOLATION = '23505'
const MAX_CODE_ATTEMPTS = 8

/** Dual-write payload: canonical room_code + legacy code (same value). */
export function withDualRoomCode(code: string): { code: string; room_code: string } {
  return { code, room_code: code }
}

/** PostgREST `.or()` filter matching room_code or legacy code column. */
export function roomCodeLookupFilter(normalized: string): string {
  return `room_code.eq.${normalized},code.eq.${normalized}`
}

/** Returns the active LYRIC lobby game, if one exists. */
export async function findLyricLobbyGame(supabase: SupabaseClient): Promise<GameRow | null> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .or(roomCodeLookupFilter(DEFAULT_ROOM_CODE))
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
      ...withDualRoomCode(DEFAULT_ROOM_CODE),
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
      .insert({ ...payload, ...withDualRoomCode(code) })
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
    .insert({ ...payload, ...withDualRoomCode(DEFAULT_ROOM_CODE) })
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

/** Resolve display/join code from a loaded game row. */
export { roomCodeFromGame }

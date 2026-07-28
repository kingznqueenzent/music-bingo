import type { SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_ROOM_CODE } from '@/lib/default-room-code'

type GameRow = { id: string; code: string; [key: string]: unknown }

export type InsertGameOrReuseResult =
  | { game: GameRow; code: string; reused: boolean; error?: undefined }
  | { game?: undefined; code?: undefined; reused?: undefined; error: string }

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

/** Use code LYRIC; reuse existing lobby row instead of creating a duplicate. */
export async function insertGameOrReuseLobby(
  supabase: SupabaseClient,
  payload: Record<string, unknown>
): Promise<InsertGameOrReuseResult> {
  const existing = await findLyricLobbyGame(supabase)
  if (existing) {
    return { game: existing, code: DEFAULT_ROOM_CODE, reused: true }
  }

  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({ ...payload, code: DEFAULT_ROOM_CODE })
    .select()
    .single()

  if (gameError) {
    if (gameError.code === '23505') {
      const raced = await findLyricLobbyGame(supabase)
      if (raced) return { game: raced, code: DEFAULT_ROOM_CODE, reused: true }
    }
    return { error: gameError.message }
  }

  if (!game) return { error: 'Failed to create game' }
  return { game: game as GameRow, code: DEFAULT_ROOM_CODE, reused: false }
}

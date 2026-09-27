import type { SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_ROOM_CODE, isLyricGridLive } from '@/lib/default-room-code'
import { roomCodeLookupFilter } from '@/lib/game-room-code'
import { isBroadcastSlug } from '@/lib/broadcast/slugs'
import type { Game, GameStatus } from '@/lib/supabase/types'

export const BROADCAST_ACTIVE_STATUSES: GameStatus[] = ['lobby', 'playing']

/** Public columns only — never selected for display: host ids, emails, tokens. */
export const BROADCAST_GAME_COLUMNS =
  'id, code, room_code, status, playlist_id, current_song_id, mode, hide_song_titles, venue_display_name, round, created_at'

export type BroadcastGame = Pick<
  Game,
  | 'id'
  | 'code'
  | 'room_code'
  | 'status'
  | 'playlist_id'
  | 'current_song_id'
  | 'mode'
  | 'hide_song_titles'
  | 'venue_display_name'
  | 'round'
  | 'created_at'
>

/** Join code from the live row only — no LYRIC / em-dash fallback. */
export function publicBroadcastJoinCode(
  game: { code?: string | null; room_code?: string | null } | null
): string | null {
  const raw = (game?.room_code ?? game?.code ?? '').trim()
  return raw || null
}

function firstRow<T>(data: T | T[] | null): T | null {
  if (!data) return null
  return Array.isArray(data) ? (data[0] ?? null) : data
}

async function latestActiveGame(
  supabase: SupabaseClient,
  roomCode?: string
): Promise<BroadcastGame | null> {
  let query = supabase
    .from('games')
    .select(BROADCAST_GAME_COLUMNS)
    .in('status', BROADCAST_ACTIVE_STATUSES)
    .order('created_at', { ascending: false })
    .limit(1)

  if (roomCode) {
    query = query.or(roomCodeLookupFilter(roomCode))
  }

  const { data, error } = await query
  if (error || !data) return null
  return firstRow(data as BroadcastGame | BroadcastGame[])
}

/**
 * Resolve the current KQ/LyricGrid game for a stable broadcast slug.
 * Pre-launch: LYRIC room (same lookup Host uses to reuse the lobby).
 * If that row is ended/missing, or when live random codes are in use:
 * newest lobby/playing game (same recency Host lists use).
 * Does not persist or hard-code a game UUID.
 */
export async function resolveActiveBroadcastGame(
  supabase: SupabaseClient,
  slug: string
): Promise<BroadcastGame | null> {
  if (!isBroadcastSlug(slug)) return null

  if (!isLyricGridLive()) {
    const lyric = await latestActiveGame(supabase, DEFAULT_ROOM_CODE)
    if (lyric) return lyric
  }

  return latestActiveGame(supabase)
}

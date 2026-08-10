/**
 * App-level helpers on top of generated Supabase types (types/database.types.ts).
 */
import { DEFAULT_ROOM_CODE } from '@/lib/default-room-code'
import type { Database } from './database.types'

export type GameStatus = 'lobby' | 'playing' | 'ended'

export type BingoGridCell = {
  position: number
  track_id: string
  title?: string | null
  artist?: string | null
  playlist_song_id?: string
  marked?: boolean
}

export type GridData = BingoGridCell[]

/** Table name for Choice A per-game tracks on existing LyricGrid DB. */
export const CHOICE_A_TRACKS_TABLE = 'bingo_game_tracks' as const

export function roomCodeFromGame(game: { code?: string | null; room_code?: string | null }): string {
  const resolved = (game.room_code ?? game.code ?? DEFAULT_ROOM_CODE).trim()
  return resolved || DEFAULT_ROOM_CODE
}

export type PlayersRow = Database['public']['Tables']['players']['Row']
export type PlayersInsert = Database['public']['Tables']['players']['Insert']
export type PlayersUpdate = Database['public']['Tables']['players']['Update']

export type { Database }

export { createClient } from './client'
export { createClient as createServerClient } from './server'
export { createTypedClient } from './typed-client'
export { attachRealtimeAuthSync, setRealtimeAuthToken } from './realtime-auth'
export type { Database } from '@/types/database.types'
export type {
  PlayersRow,
  PlayersInsert,
  PlayersUpdate,
  GridData,
  BingoGridCell,
  GameStatus,
} from '@/types/database-extras'
export { CHOICE_A_TRACKS_TABLE, roomCodeFromGame } from '@/types/database-extras'

/** Default room code for the shared LyricGrid lobby (`games.code` / Choice A `room_code`). */
export const DEFAULT_ROOM_CODE = 'LYRIC'

export function normalizeRoomCode(value: string | null | undefined): string {
  return (value ?? DEFAULT_ROOM_CODE).trim().toUpperCase() || DEFAULT_ROOM_CODE
}

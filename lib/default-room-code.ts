/** Default room code for the shared LyricGrid lobby (`games.code` / Choice A `room_code`). */
export const DEFAULT_ROOM_CODE = 'LYRIC'

const LIVE_ROOM_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const LIVE_ROOM_CODE_LENGTH = 6

function parseIsLiveFlag(value: string | null | undefined): boolean | null {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return null
  return normalized === 'true'
}

/**
 * Pre-launch (default): false when unset or any value other than `"true"`.
 * Server may also read `IS_LIVE` when `NEXT_PUBLIC_IS_LIVE` is unset.
 */
export function isLyricGridLive(): boolean {
  const fromPublic = parseIsLiveFlag(process.env.NEXT_PUBLIC_IS_LIVE)
  if (fromPublic !== null) return fromPublic

  if (typeof window === 'undefined') {
    const fromServer = parseIsLiveFlag(process.env.IS_LIVE)
    if (fromServer !== null) return fromServer
  }

  return false
}

/** Join UI default: shared LYRIC lobby pre-launch; empty when live. */
export function getDefaultJoinRoomCode(): string {
  return isLyricGridLive() ? '' : DEFAULT_ROOM_CODE
}

/** Room code for a newly created game (LYRIC pre-launch, random 6-char when live). */
export function generateRoomCode(): string {
  if (!isLyricGridLive()) {
    return DEFAULT_ROOM_CODE
  }

  const bytes = new Uint8Array(LIVE_ROOM_CODE_LENGTH)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => LIVE_ROOM_CODE_ALPHABET[byte % LIVE_ROOM_CODE_ALPHABET.length]).join('')
}

export function normalizeRoomCode(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim().toUpperCase()
  if (trimmed) return trimmed
  return getDefaultJoinRoomCode() || DEFAULT_ROOM_CODE
}

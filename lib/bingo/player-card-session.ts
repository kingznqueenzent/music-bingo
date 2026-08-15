/** Stable identifiers and localStorage keys for one card per player per game. */

export const BROWSER_SESSION_STORAGE_KEY = 'lyricgrid-browser-session-id'

const HOST_CARD_STORAGE_PREFIX = 'lyricgrid-host-card-'
const PLAYER_CARD_STORAGE_PREFIX = 'lyricgrid-player-card-'

export function hostPlayerIdentifier(gameId: string): string {
  return `host-${gameId}`
}

export function browserPlayerIdentifier(sessionId: string): string {
  return `browser-${sessionId}`
}

export function hostCardStorageKey(gameId: string): string {
  return `${HOST_CARD_STORAGE_PREFIX}${gameId}`
}

export function playerCardStorageKey(gameId: string): string {
  return `${PLAYER_CARD_STORAGE_PREFIX}${gameId}`
}

/** Prefer host card storage, then player card storage (same origin, all tabs). */
export function getStoredCardIdForGame(gameId: string): string | null {
  if (typeof window === 'undefined' || !gameId) return null
  try {
    const host = localStorage.getItem(hostCardStorageKey(gameId))?.trim()
    if (host) return host
    const player = localStorage.getItem(playerCardStorageKey(gameId))?.trim()
    return player || null
  } catch {
    return null
  }
}

export function setStoredPlayerCardId(
  gameId: string,
  cardId: string,
  options?: { isHost?: boolean }
): void {
  if (typeof window === 'undefined' || !gameId || !cardId) return
  try {
    localStorage.setItem(playerCardStorageKey(gameId), cardId)
    if (options?.isHost) {
      localStorage.setItem(hostCardStorageKey(gameId), cardId)
    }
  } catch {
    // ignore quota / private mode
  }
}

/** Per-browser stable id reused across tabs for the same player identity. */
export function getOrCreateBrowserSessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    const existing = localStorage.getItem(BROWSER_SESSION_STORAGE_KEY)?.trim()
    if (existing) return existing
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(BROWSER_SESSION_STORAGE_KEY, id)
    return id
  } catch {
    return `sess-${Date.now()}`
  }
}

/** Authenticated game host always maps to the host player board identifier. */
export function resolveEffectivePlayerIdentifier(input: {
  gameId: string
  playerIdentifier?: string | null
  authUserId?: string | null
  gameHostId?: string | null
}): string | null {
  const platformId = input.playerIdentifier?.trim() || null
  if (
    input.authUserId &&
    input.gameHostId &&
    input.authUserId === input.gameHostId
  ) {
    return hostPlayerIdentifier(input.gameId)
  }
  return platformId
}

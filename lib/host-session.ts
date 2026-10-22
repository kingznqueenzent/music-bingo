/** Client-side host session keys — clear when ending a game so /host stays clean. */

export const HOST_LAST_GAME_KEY = 'lyricgrid-host-last-game-id'
export const HOST_LAST_CODE_KEY = 'lyricgrid-host-last-room-code'

export function rememberHostGame(gameId: string, roomCode?: string | null): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(HOST_LAST_GAME_KEY, gameId)
    if (roomCode?.trim()) {
      window.localStorage.setItem(HOST_LAST_CODE_KEY, roomCode.trim())
    }
  } catch {
    // ignore quota / private mode
  }
}

export function clearHostGameSession(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(HOST_LAST_GAME_KEY)
    window.localStorage.removeItem(HOST_LAST_CODE_KEY)
  } catch {
    // ignore
  }
}

/** Read last game id if present — callers must NOT auto-navigate to it. */
export function peekHostLastGameId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(HOST_LAST_GAME_KEY)?.trim() || null
  } catch {
    return null
  }
}

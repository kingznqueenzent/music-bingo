/**
 * Player-facing routes show a simplified navbar without host/admin chrome,
 * even when the visitor is signed in as a host.
 */
export function isPlayerFacingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  if (pathname === '/join') return true
  if (pathname === '/play') return true
  if (pathname.startsWith('/play/')) return true
  return false
}

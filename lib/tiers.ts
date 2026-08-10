/**
 * Game tier labels (feature/branding). Player caps removed for unlimited live-stream lobbies.
 * Media library track quota: see `lib/media/track-quota.ts` (Free = 50 tracks).
 */

export type GameTier = 'free' | 'pro' | 'enterprise'

/** @deprecated Player limits removed — always unlimited. Kept for legacy UI callers. */
export function getMaxPlayersForTier(_tier: GameTier): number {
  return Number.POSITIVE_INFINITY
}

export function hasPlayerCap(_tier: GameTier): boolean {
  return false
}

export function formatPlayerCapLabel(_tier: GameTier): string {
  return 'Unlimited players'
}

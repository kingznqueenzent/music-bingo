/**
 * Game tier labels (feature/branding). Player caps removed for unlimited live-stream lobbies.
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

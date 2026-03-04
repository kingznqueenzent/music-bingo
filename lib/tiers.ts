/**
 * Pricing tier limits. Shared by server actions and client (e.g. host dashboard).
 */

export type GameTier = 'free' | 'pro' | 'enterprise'

const FREE_MAX_PLAYERS = 10
const PRO_MAX_PLAYERS = 50
const ENTERPRISE_MAX_PLAYERS = 100_000

export function getMaxPlayersForTier(tier: GameTier): number {
  switch (tier) {
    case 'free':
      return FREE_MAX_PLAYERS
    case 'pro':
      return PRO_MAX_PLAYERS
    case 'enterprise':
      return ENTERPRISE_MAX_PLAYERS
    default:
      return FREE_MAX_PLAYERS
  }
}

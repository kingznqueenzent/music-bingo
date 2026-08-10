/**
 * LyricGrid subscription tiers (host account capabilities).
 * - Free: core game hosting/participation; media library blocked.
 * - Pro: unlimited media library (tracks, uploads, playback).
 * - Enterprise: media library + custom branding (white-label).
 */

export type GameTier = 'free' | 'pro' | 'enterprise'

export const TIER_DISPLAY_NAMES: Record<GameTier, string> = {
  free: 'Free',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

/** Short labels for host create / monetization UI. */
export const TIER_FEATURE_LABELS: Record<GameTier, string> = {
  free: 'Free (host games, unlimited players)',
  pro: 'Pro (full media library)',
  enterprise: 'Enterprise (media library + custom branding)',
}

/** Pro and Enterprise include the shared media library (uploads, catalog, playback). */
export function hasMediaLibraryAccess(tier: GameTier): boolean {
  return tier === 'pro' || tier === 'enterprise'
}

/** Custom venue branding (logo, colors, hide LyricGrid) is Enterprise-only. */
export function hasBrandingAccess(tier: GameTier): boolean {
  return tier === 'enterprise'
}

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

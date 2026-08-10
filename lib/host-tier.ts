import type { GameTier } from '@/lib/tiers'

const VALID_TIERS: GameTier[] = ['free', 'pro', 'enterprise']

function normalizeTier(value: string | null | undefined): GameTier | null {
  const v = (value ?? '').trim().toLowerCase()
  if (VALID_TIERS.includes(v as GameTier)) return v as GameTier
  return null
}

/**
 * Host tier resolution for media-library and branding gates:
 * 1. Explicit profile tier when provided (future: `player_profiles.tier`).
 * 2. `HOST_TIER` env override — ops / Vercel production default for venue accounts.
 * 3. Fallback `free` (media library blocked; core hosting still available).
 */
export function resolveHostTier(options?: {
  profileTier?: string | null
  envTier?: string | null
}): GameTier {
  return (
    normalizeTier(options?.profileTier) ??
    normalizeTier(options?.envTier ?? process.env.HOST_TIER) ??
    'free'
  )
}

/** Client bootstrap: public env mirrors server `HOST_TIER` until per-account billing ships. */
export function resolveClientHostTier(profileTier?: string | null): GameTier {
  return resolveHostTier({
    profileTier,
    envTier:
      typeof process !== 'undefined'
        ? process.env.NEXT_PUBLIC_HOST_TIER ?? process.env.HOST_TIER
        : undefined,
  })
}

import type { GameTier } from '@/lib/tiers'

/** Free-tier cap on `public.songs` rows (the shared media library catalog). */
export const FREE_TIER_TRACK_LIMIT = 50

export type TrackQuotaSnapshot = {
  tier: GameTier
  currentCount: number
  limit: number | null
  remaining: number | null
  isUnlimited: boolean
}

export function getTrackLimitForTier(tier: GameTier): number | null {
  if (tier === 'pro' || tier === 'enterprise') return null
  return FREE_TIER_TRACK_LIMIT
}

export function isUnlimitedTrackTier(tier: GameTier): boolean {
  return tier === 'pro' || tier === 'enterprise'
}

export function buildTrackQuotaSnapshot(tier: GameTier, currentCount: number): TrackQuotaSnapshot {
  const limit = getTrackLimitForTier(tier)
  const isUnlimited = limit === null
  const remaining = isUnlimited ? null : Math.max(0, limit - currentCount)
  return { tier, currentCount, limit, remaining, isUnlimited }
}

export function formatTrackQuotaLabel(snapshot: TrackQuotaSnapshot): string {
  if (snapshot.isUnlimited) return 'Unlimited tracks'
  return `${snapshot.currentCount} / ${snapshot.limit} tracks used`
}

export type TrackQuotaCheckResult =
  | { allowed: true; snapshot: TrackQuotaSnapshot }
  | { allowed: false; snapshot: TrackQuotaSnapshot; reason: string }

/** Returns whether `addingCount` new catalog rows fit under the host tier cap. */
export function checkTrackQuota(
  tier: GameTier,
  currentCount: number,
  addingCount: number
): TrackQuotaCheckResult {
  const snapshot = buildTrackQuotaSnapshot(tier, currentCount)
  if (snapshot.isUnlimited || addingCount <= 0) {
    return { allowed: true, snapshot }
  }

  const limit = snapshot.limit!
  if (currentCount >= limit) {
    return {
      allowed: false,
      snapshot,
      reason: `Free plan is limited to ${limit} tracks. Upgrade to Pro or Enterprise for unlimited library storage.`,
    }
  }

  if (currentCount + addingCount > limit) {
    const room = Math.max(0, limit - currentCount)
    return {
      allowed: false,
      snapshot,
      reason:
        room === 0
          ? `Free plan is limited to ${limit} tracks. Upgrade to Pro or Enterprise for unlimited library storage.`
          : `Free plan allows ${limit} tracks (${room} slot${room === 1 ? '' : 's'} left). Remove tracks or upgrade for unlimited storage.`,
    }
  }

  return { allowed: true, snapshot }
}

export const TRACK_QUOTA_EXCEEDED_CODE = 'TRACK_QUOTA_EXCEEDED'

import type { GameTier } from '@/lib/tiers'
import { hasMediaLibraryAccess } from '@/lib/tiers'

/** Error code returned by upload/catalog APIs when Free tier lacks library access. */
export const MEDIA_LIBRARY_REQUIRES_PRO_CODE = 'MEDIA_LIBRARY_REQUIRES_PRO'

/** @deprecated Use MEDIA_LIBRARY_REQUIRES_PRO_CODE */
export const TRACK_QUOTA_EXCEEDED_CODE = MEDIA_LIBRARY_REQUIRES_PRO_CODE

export type TrackQuotaSnapshot = {
  tier: GameTier
  currentCount: number
  limit: number | null
  remaining: number | null
  isUnlimited: boolean
  mediaLibraryAccess: boolean
}

export function getTrackLimitForTier(tier: GameTier): number | null {
  if (hasMediaLibraryAccess(tier)) return null
  return 0
}

export function isUnlimitedTrackTier(tier: GameTier): boolean {
  return hasMediaLibraryAccess(tier)
}

export function buildTrackQuotaSnapshot(tier: GameTier, currentCount: number): TrackQuotaSnapshot {
  const mediaLibraryAccess = hasMediaLibraryAccess(tier)
  const limit = getTrackLimitForTier(tier)
  const isUnlimited = mediaLibraryAccess
  const remaining = isUnlimited ? null : 0
  return { tier, currentCount, limit, remaining, isUnlimited, mediaLibraryAccess }
}

export function formatTrackQuotaLabel(snapshot: TrackQuotaSnapshot): string {
  if (!snapshot.mediaLibraryAccess) return 'Media Library requires Pro+'
  return 'Unlimited tracks'
}

export type TrackQuotaCheckResult =
  | { allowed: true; snapshot: TrackQuotaSnapshot }
  | { allowed: false; snapshot: TrackQuotaSnapshot; reason: string }

const MEDIA_LIBRARY_BLOCKED_REASON =
  'Media Library requires Pro+. Upgrade to Pro for unlimited library storage and management.'

/** Returns whether `addingCount` new catalog rows are allowed for the host tier. */
export function checkTrackQuota(
  tier: GameTier,
  currentCount: number,
  addingCount: number
): TrackQuotaCheckResult {
  const snapshot = buildTrackQuotaSnapshot(tier, currentCount)

  if (!hasMediaLibraryAccess(tier)) {
    return {
      allowed: false,
      snapshot,
      reason: MEDIA_LIBRARY_BLOCKED_REASON,
    }
  }

  if (addingCount <= 0) {
    return { allowed: true, snapshot }
  }

  return { allowed: true, snapshot }
}

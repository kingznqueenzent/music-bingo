import { NextResponse } from 'next/server'
import { resolveHostTier } from '@/lib/host-tier'
import { hasMediaLibraryAccess, type GameTier } from '@/lib/tiers'
import { MEDIA_LIBRARY_REQUIRES_PRO_CODE } from '@/lib/media/track-quota'

const BLOCKED_REASON =
  'Media Library requires Pro+. Upgrade to Pro for unlimited library storage and management.'

export type MediaLibraryAccessResult =
  | { allowed: true; tier: GameTier }
  | { allowed: false; tier: GameTier }

/** Server-side Pro+ gate for catalog APIs and actions (env tier + optional profile tier). */
export function checkMediaLibraryAccess(profileTier?: string | null): MediaLibraryAccessResult {
  const tier = resolveHostTier({ profileTier })
  if (!hasMediaLibraryAccess(tier)) {
    return { allowed: false, tier }
  }
  return { allowed: true, tier }
}

export function mediaLibraryBlockedMessage(): string {
  return BLOCKED_REASON
}

export function mediaLibraryBlockedJson(tier: GameTier) {
  return {
    error: BLOCKED_REASON,
    code: MEDIA_LIBRARY_REQUIRES_PRO_CODE,
    tier,
    mediaLibraryAccess: false,
  }
}

export function mediaLibraryBlockedResponse(tier: GameTier, status = 403) {
  return NextResponse.json(mediaLibraryBlockedJson(tier), { status })
}

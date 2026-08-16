import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveHostTier } from '@/lib/host-tier'
import { hasMediaLibraryAccess, type GameTier } from '@/lib/tiers'
import { MEDIA_LIBRARY_REQUIRES_PRO_CODE } from '@/lib/media/track-quota'

const BLOCKED_REASON =
  'Media Library requires Pro+. Upgrade to Pro for unlimited library storage and management.'

const TIER_RANK: Record<GameTier, number> = { free: 0, pro: 1, enterprise: 2 }

export type MediaLibraryAccessResult =
  | { allowed: true; tier: GameTier }
  | { allowed: false; tier: GameTier }

function pickHighestTier(values: Array<string | null | undefined>): string | null {
  let best: GameTier | null = null
  for (const value of values) {
    const normalized = (value ?? '').trim().toLowerCase() as GameTier
    if (!(normalized in TIER_RANK)) continue
    if (!best || TIER_RANK[normalized] > TIER_RANK[best]) best = normalized
  }
  return best
}

/**
 * Load subscription_tier for the signed-in user, or the best admin profile tier
 * (venue/admin-cookie flows that may not have a user session on every request).
 */
export async function loadProfileSubscriptionTier(
  supabase: SupabaseClient
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.id) {
    const { data: profile } = await supabase
      .from('player_profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .maybeSingle()
    const tier = (profile as { subscription_tier?: string | null } | null)?.subscription_tier
    if (tier) return tier
  }

  const { data: admins } = await supabase
    .from('player_profiles')
    .select('subscription_tier')
    .eq('is_admin', true)

  return pickHighestTier(
    (admins ?? []).map((row) => (row as { subscription_tier?: string | null }).subscription_tier)
  )
}

/** Server-side Pro+ gate for catalog APIs and actions (env tier + optional profile tier). */
export function checkMediaLibraryAccess(profileTier?: string | null): MediaLibraryAccessResult {
  const tier = resolveHostTier({ profileTier })
  if (!hasMediaLibraryAccess(tier)) {
    return { allowed: false, tier }
  }
  return { allowed: true, tier }
}

/** Resolve profile/env tier then gate Media Library. */
export async function checkMediaLibraryAccessForClient(
  supabase: SupabaseClient
): Promise<MediaLibraryAccessResult> {
  const profileTier = await loadProfileSubscriptionTier(supabase)
  return checkMediaLibraryAccess(profileTier)
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

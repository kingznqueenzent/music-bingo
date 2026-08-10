import { NextResponse } from 'next/server'
import { resolveHostTier } from '@/lib/host-tier'
import { buildTrackQuotaSnapshot, getTrackLimitForTier } from '@/lib/media/track-quota'
import { hasBrandingAccess, hasMediaLibraryAccess } from '@/lib/tiers'
import { countCatalogSongs } from '@/lib/media/track-quota-server'
import { createClient } from '@/lib/supabase/server'

/** Host subscription tier + catalog usage for media-manager quota UI. */
export async function GET() {
  try {
    const supabase = createClient()
    const tier = resolveHostTier()
    const currentCount = await countCatalogSongs(supabase)
    const snapshot = buildTrackQuotaSnapshot(tier, currentCount)

    return NextResponse.json({
      tier,
      trackLimit: getTrackLimitForTier(tier),
      currentCount,
      remaining: snapshot.remaining,
      isUnlimited: snapshot.isUnlimited,
      mediaLibraryAccess: hasMediaLibraryAccess(tier),
      hasBrandingAccess: hasBrandingAccess(tier),
      label: snapshot.isUnlimited ? 'Unlimited' : snapshot.mediaLibraryAccess ? 'Unlimited tracks' : 'Media Library requires Pro+',
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not load host tier.' },
      { status: 500 }
    )
  }
}

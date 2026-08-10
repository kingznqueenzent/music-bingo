import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveHostTier } from '@/lib/host-tier'
import {
  checkTrackQuota,
  MEDIA_LIBRARY_REQUIRES_PRO_CODE,
  type TrackQuotaCheckResult,
} from '@/lib/media/track-quota'

export async function countCatalogSongs(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from('songs')
    .select('*', { count: 'exact', head: true })

  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function assertTrackQuotaForInsert(
  supabase: SupabaseClient,
  addingCount: number,
  profileTier?: string | null
): Promise<TrackQuotaCheckResult> {
  const tier = resolveHostTier({ profileTier })
  const currentCount = await countCatalogSongs(supabase)
  return checkTrackQuota(tier, currentCount, addingCount)
}

export function trackQuotaErrorResponse(result: Extract<TrackQuotaCheckResult, { allowed: false }>) {
  return {
    error: result.reason,
    code: MEDIA_LIBRARY_REQUIRES_PRO_CODE,
    tier: result.snapshot.tier,
    currentCount: result.snapshot.currentCount,
    limit: result.snapshot.limit,
    remaining: result.snapshot.remaining,
  }
}

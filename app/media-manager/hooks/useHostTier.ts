'use client'

import { useCallback, useEffect, useState } from 'react'
import type { GameTier } from '@/lib/tiers'
import { resolveClientHostTier } from '@/lib/host-tier'
import { buildTrackQuotaSnapshot, formatTrackQuotaLabel } from '@/lib/media/track-quota'

export type HostTierState = {
  tier: GameTier
  loading: boolean
  currentCount: number
  label: string
  isUnlimited: boolean
  limit: number | null
  remaining: number | null
  refreshFromServer: () => Promise<void>
}

/** Loads host tier from API; falls back to public env tier while loading. */
export function useHostTier(catalogCount: number): HostTierState {
  const fallbackTier = resolveClientHostTier()
  const [tier, setTier] = useState<GameTier>(fallbackTier)
  const [loading, setLoading] = useState(true)

  const refreshFromServer = useCallback(async () => {
    try {
      const res = await fetch('/api/host/tier', { credentials: 'include', cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as { tier?: GameTier }
      if (data.tier) setTier(data.tier)
    } catch {
      // Keep env/bootstrap tier on transient failures.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshFromServer()
  }, [refreshFromServer])

  const snapshot = buildTrackQuotaSnapshot(tier, catalogCount)

  return {
    tier,
    loading,
    currentCount: catalogCount,
    label: formatTrackQuotaLabel(snapshot),
    isUnlimited: snapshot.isUnlimited,
    limit: snapshot.limit,
    remaining: snapshot.remaining,
    refreshFromServer,
  }
}

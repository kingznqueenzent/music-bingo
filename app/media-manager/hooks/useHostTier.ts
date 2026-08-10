'use client'

import { useCallback, useEffect, useState } from 'react'
import type { GameTier } from '@/lib/tiers'
import { TIER_DISPLAY_NAMES } from '@/lib/tiers'
import { resolveClientHostTier } from '@/lib/host-tier'
import { buildTrackQuotaSnapshot, formatTrackQuotaLabel } from '@/lib/media/track-quota'

type HostTierApiResponse = {
  tier?: GameTier
  isUnlimited?: boolean
  label?: string
}

export type HostTierState = {
  tier: GameTier
  loading: boolean
  currentCount: number
  label: string
  badgeLabel: string
  isUnlimited: boolean
  limit: number | null
  remaining: number | null
  refreshFromServer: () => Promise<void>
}

function buildBadgeLabel(tier: GameTier, snapshot: ReturnType<typeof buildTrackQuotaSnapshot>): string {
  const name = TIER_DISPLAY_NAMES[tier]
  if (snapshot.isUnlimited) return `${name} · Unlimited`
  return `${name} · ${snapshot.currentCount}/${snapshot.limit}`
}

/** Loads host tier from `/api/host/tier` (server reads `HOST_TIER`). */
export function useHostTier(catalogCount: number): HostTierState {
  const envTier = resolveClientHostTier()
  const hasEnvTier =
    typeof process !== 'undefined' &&
    Boolean(process.env.NEXT_PUBLIC_HOST_TIER?.trim())

  const [tier, setTier] = useState<GameTier>(envTier)
  const [loading, setLoading] = useState(!hasEnvTier)

  const refreshFromServer = useCallback(async () => {
    try {
      const res = await fetch('/api/host/tier', { credentials: 'include', cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as HostTierApiResponse
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
  // Avoid false Free-tier gating before the server responds (HOST_TIER is server-only).
  const isUnlimited = loading ? true : snapshot.isUnlimited

  return {
    tier,
    loading,
    currentCount: catalogCount,
    label: formatTrackQuotaLabel(snapshot),
    badgeLabel: buildBadgeLabel(tier, snapshot),
    isUnlimited,
    limit: loading ? null : snapshot.limit,
    remaining: loading ? null : snapshot.remaining,
    refreshFromServer,
  }
}

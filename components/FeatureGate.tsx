'use client'

import type { ReactNode } from 'react'
import type { FeatureFlagKey } from '@/lib/feature-flag-keys'
import { useFeatureFlagsOptional } from '@/components/FeatureFlagsProvider'

export function FeatureGate({
  flag,
  children,
  fallback = null,
}: {
  flag: FeatureFlagKey
  children: ReactNode
  fallback?: ReactNode
}) {
  const ctx = useFeatureFlagsOptional()
  if (!ctx) return <>{fallback}</>
  if (ctx.loading) return <>{fallback}</>
  return ctx.isEnabled(flag) ? <>{children}</> : <>{fallback}</>
}

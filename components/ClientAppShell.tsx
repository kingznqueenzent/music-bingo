'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { FeatureFlagsProvider } from '@/components/FeatureFlagsProvider'
import { AppShell } from '@/components/AppShell'
import { SupabaseRealtimeAuth } from '@/components/SupabaseRealtimeAuth'

export function ClientAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isKingzSite = pathname === '/' || pathname === '/kingz'

  if (isKingzSite) {
    return <>{children}</>
  }

  return (
    <FeatureFlagsProvider>
      <SupabaseRealtimeAuth />
      <AppShell>{children}</AppShell>
    </FeatureFlagsProvider>
  )
}

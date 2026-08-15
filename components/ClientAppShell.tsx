'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { FeatureFlagsProvider } from '@/components/FeatureFlagsProvider'
import { AppShell } from '@/components/AppShell'
import { SupabaseRealtimeAuth } from '@/components/SupabaseRealtimeAuth'
import { isKingzPublicPath } from '@/lib/site-host'

export function ClientAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [host, setHost] = useState<string | null>(null)

  useEffect(() => {
    setHost(window.location.hostname)
  }, [])

  const isKingzSite = isKingzPublicPath(pathname, host)
  const isOverlayRoute = pathname === '/overlay' || pathname.startsWith('/overlay/')

  if (isKingzSite || isOverlayRoute) {
    return <>{children}</>
  }

  return (
    <FeatureFlagsProvider>
      <SupabaseRealtimeAuth />
      <AppShell>{children}</AppShell>
    </FeatureFlagsProvider>
  )
}

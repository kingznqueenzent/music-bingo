'use client'

import type { ReactNode } from 'react'
import { SupabaseRealtimeAuth } from '@/components/SupabaseRealtimeAuth'

/** Wraps kingz page — auth sync for staff admin menu on marketing site. */
export function KingzPageClient({ children }: { children: ReactNode }) {
  return (
    <>
      <SupabaseRealtimeAuth />
      {children}
    </>
  )
}

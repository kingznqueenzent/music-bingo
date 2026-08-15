'use client'

import type { ReactNode } from 'react'
import { HostWinPatternProvider } from '@/components/host/HostWinPatternContext'

/** Shares default win pattern between HostCommandCenter and HostCreateForm on /host. */
export function HostPageShell({ children }: { children: ReactNode }) {
  return <HostWinPatternProvider>{children}</HostWinPatternProvider>
}

'use client'

import type { ReactNode } from 'react'

/** Wraps kingz page — isolates client-only children from server page shell. */
export function KingzPageClient({ children }: { children: ReactNode }) {
  return <>{children}</>
}

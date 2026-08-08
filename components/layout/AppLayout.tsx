'use client'

import type { ReactNode } from 'react'
import { Navbar } from '@/components/layout/Navbar'

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-brand-dark text-white overflow-x-hidden">
      <Navbar />
      <div className="pt-12 min-h-dvh">{children}</div>
    </div>
  )
}

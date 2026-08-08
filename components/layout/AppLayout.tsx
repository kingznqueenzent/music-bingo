'use client'

import type { ReactNode } from 'react'
import { Navbar } from '@/components/layout/Navbar'

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-brand-dark text-white overflow-x-hidden">
      <Navbar />
      <div className="pt-[calc(3.5rem+env(safe-area-inset-top,0px))] min-h-dvh">{children}</div>
    </div>
  )
}

'use client'

import type { ReactNode } from 'react'
import { Navbar } from '@/components/layout/Navbar'

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-dark text-white">
      <Navbar />
      <div className="pt-12">{children}</div>
    </div>
  )
}

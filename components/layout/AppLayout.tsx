'use client'

import type { ReactNode } from 'react'
import { Navbar } from '@/components/layout/Navbar'

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#121212] text-white overflow-x-hidden selection:bg-[#00FF66]/30 selection:text-[#00FF66]">
      <Navbar />
      <div className="pt-[calc(3rem+env(safe-area-inset-top,0px))] min-h-dvh">{children}</div>
    </div>
  )
}

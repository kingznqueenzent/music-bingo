'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import type { WinPattern } from '@/lib/bingo-win-pattern'

type HostWinPatternContextValue = {
  winPattern: WinPattern
  setWinPattern: (pattern: WinPattern) => void
}

const HostWinPatternContext = createContext<HostWinPatternContextValue | null>(null)

export function HostWinPatternProvider({ children }: { children: ReactNode }) {
  const [winPattern, setWinPattern] = useState<WinPattern>('line')
  return (
    <HostWinPatternContext.Provider value={{ winPattern, setWinPattern }}>
      {children}
    </HostWinPatternContext.Provider>
  )
}

export function useHostWinPatternOptional() {
  return useContext(HostWinPatternContext)
}

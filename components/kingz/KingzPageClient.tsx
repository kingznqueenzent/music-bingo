'use client'

import type { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { KingzStickyBookCta } from '@/components/kingz/KingzStickyBookCta'

const KingzMusicPlayer = dynamic(
  () => import('@/components/kingz/KingzMusicPlayer').then((m) => m.KingzMusicPlayer),
  { ssr: false }
)

/** Wraps kingz page — deferred music player only (no host-portal auth). */
export function KingzPageClient({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <KingzStickyBookCta />
      <KingzMusicPlayer />
    </>
  )
}

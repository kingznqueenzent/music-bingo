'use client'

import type { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { SupabaseRealtimeAuth } from '@/components/SupabaseRealtimeAuth'

const KingzMusicPlayer = dynamic(
  () => import('@/components/kingz/KingzMusicPlayer').then((m) => m.KingzMusicPlayer),
  { ssr: false }
)

/** Wraps kingz page — auth sync + deferred music player (keeps initial JS smaller). */
export function KingzPageClient({ children }: { children: ReactNode }) {
  return (
    <>
      <SupabaseRealtimeAuth />
      {children}
      <KingzMusicPlayer />
    </>
  )
}

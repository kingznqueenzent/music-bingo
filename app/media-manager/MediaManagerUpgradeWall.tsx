'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { GameTier } from '@/lib/tiers'
import { MediaLibraryUpgradeModal } from '@/components/media/MediaLibraryUpgradeModal'

/** Full-page upgrade wall for `/media-manager` when Free tier lacks library access. */
export function MediaManagerUpgradeWall({ tier }: { tier: GameTier }) {
  return (
    <main className="min-h-dvh lg-surface-canvas flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-4">
        <Link
          href="/host"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-[#00FFFF] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to host dashboard
        </Link>
        <MediaLibraryUpgradeModal open onClose={() => {}} tier={tier} modal={false} />
      </div>
    </main>
  )
}

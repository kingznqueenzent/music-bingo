'use client'

import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { BrowseThemesClient } from './BrowseThemesClient'

export default function BrowseThemesPage() {
  return (
    <div data-page="browse-themes" className="min-h-dvh lg-surface-canvas">
      <Suspense
        fallback={
          <div className="flex min-h-dvh items-center justify-center text-white/45 gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--lg-neon)]" />
            Loading themes…
          </div>
        }
      >
        <BrowseThemesClient />
      </Suspense>
    </div>
  )
}

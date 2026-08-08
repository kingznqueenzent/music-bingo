'use client'

import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { MediaManagerPageClient } from './MediaManagerDashboard'

export default function MediaManagerPage() {
  return (
    <div data-page="media-manager" className="min-h-dvh">
      <Suspense
        fallback={
          <div className="flex min-h-dvh items-center justify-center text-slate-400 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Media Manager…
          </div>
        }
      >
        <MediaManagerPageClient />
      </Suspense>
    </div>
  )
}

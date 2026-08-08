'use client'

import { MediaManagerPageClient } from './MediaManagerDashboard'

export default function MediaManagerPage() {
  return (
    <div data-page="media-manager" className="min-h-screen">
      <MediaManagerPageClient />
    </div>
  )
}

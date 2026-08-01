'use client'

import { useState } from 'react'
import { MediaManagerPageClient } from './MediaManagerDashboard'

export default function MediaManagerPage() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div data-page="media-manager" className="min-h-screen">
      <MediaManagerPageClient
        searchQuery={searchQuery}
        searchInput={
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search songs, artists, or URLs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        }
      />
    </div>
  )
}

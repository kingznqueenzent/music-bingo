'use client'

import type { ReactNode } from 'react'

const SURFACE = '#1E1E1E'

export type MediaManagerFilterTabsProps = {
  libraryView: 'all' | 'uncategorized'
  allTracksActive: boolean
  totalCount: number
  uncategorizedCount: number
  loading?: boolean
  onShowAll: () => void
  onToggleUncategorized: () => void
}

export function MediaManagerFilterTabs({
  libraryView,
  allTracksActive,
  totalCount,
  uncategorizedCount,
  loading = false,
  onShowAll,
  onToggleUncategorized,
}: MediaManagerFilterTabsProps) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Library status filters">
      <button
        type="button"
        role="tab"
        aria-selected={allTracksActive}
        onClick={onShowAll}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
          allTracksActive
            ? 'border-[#00FFFF]/60 bg-[#00FFFF]/10 text-[#00FFFF]'
            : 'border-white/10 text-gray-400 hover:border-white/25'
        }`}
      >
        All tracks ({loading ? '…' : totalCount})
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={libraryView === 'uncategorized'}
        onClick={onToggleUncategorized}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
          libraryView === 'uncategorized'
            ? 'border-amber-500/60 bg-amber-500/10 text-amber-200'
            : 'border-white/10 text-gray-400 hover:border-amber-500/40'
        }`}
      >
        Uncategorized ({loading ? '…' : uncategorizedCount})
      </button>
    </div>
  )
}

export function MediaManagerFiltersPanel({ children }: { children: ReactNode }) {
  return (
    <section
      aria-label="Filters and theme coverage"
      className="p-4 rounded-xl border border-white/10 space-y-4"
      style={{ backgroundColor: SURFACE }}
    >
      {children}
    </section>
  )
}

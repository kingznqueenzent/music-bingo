'use client'

import { Search, SlidersHorizontal, X } from 'lucide-react'
import { ThemeSelect } from './ThemeSelect'
import type { CatalogTheme } from './types'

const BG = '#121212'
const SURFACE = '#1E1E1E'
const NEON = '#00FFFF'

export type BatchThemeFilter = 'all' | 'country' | 'rock' | 'billboard'

export const BATCH_THEME_PILLS: { id: BatchThemeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'country', label: 'Country' },
  { id: 'rock', label: 'Rock' },
  { id: 'billboard', label: 'Billboard' },
]

export type MediaManagerFilterBarProps = {
  searchQuery: string
  onSearchChange: (value: string) => void
  batchFilter: BatchThemeFilter
  onBatchFilterChange: (value: BatchThemeFilter) => void
  selectedThemeId: string
  onThemeChange: (themeId: string) => void
  themes: CatalogTheme[]
  themeCounts: Record<string, number>
  resultCount: number
  totalCount: number
  loading?: boolean
  onClearSearch?: () => void
}

export function MediaManagerFilterBar({
  searchQuery,
  onSearchChange,
  batchFilter,
  onBatchFilterChange,
  selectedThemeId,
  onThemeChange,
  themes,
  themeCounts,
  resultCount,
  totalCount,
  loading = false,
  onClearSearch,
}: MediaManagerFilterBarProps) {
  const themesWithTracks = [...themes]
    .filter((t) => (themeCounts[t.id] ?? 0) > 0)
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <section
      aria-label="Search and filter library"
      className="p-3 sm:p-4 rounded-xl border border-[#00FFFF]/25 shadow-lg shadow-black/20 space-y-4 md:sticky md:top-14 md:z-20"
      style={{ backgroundColor: SURFACE }}
    >
      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <label htmlFor="media-manager-search" className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Search library
          </label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
            <input
              id="media-manager-search"
              type="search"
              placeholder="Search titles, artists, genres…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full border border-white/15 rounded-xl pl-12 pr-12 py-3.5 text-base focus:border-[#00FFFF] outline-none ring-0 focus:ring-2 focus:ring-[#00FFFF]/20 min-h-12"
              style={{ backgroundColor: BG, color: '#fff' }}
              autoComplete="off"
              spellCheck={false}
            />
            {searchQuery.trim() && onClearSearch ? (
              <button
                type="button"
                onClick={onClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 min-h-10 min-w-10 touch-manipulation"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="w-full lg:w-72 space-y-2 shrink-0">
          <label htmlFor="media-manager-theme" className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Theme
          </label>
          <ThemeSelect
            id="media-manager-theme"
            value={selectedThemeId}
            onChange={onThemeChange}
            themes={themesWithTracks}
            themeCounts={themeCounts}
            emptyLabel="All themes"
            aria-label="Filter by theme"
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-gray-500">Quick filters</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Batch theme filters">
          {BATCH_THEME_PILLS.map((pill) => {
            const active = batchFilter === pill.id
            return (
              <button
                key={pill.id}
                type="button"
                aria-pressed={active}
                onClick={() => onBatchFilterChange(pill.id)}
                className={`px-3 py-2 min-h-10 rounded-full text-xs font-semibold border transition-colors touch-manipulation ${
                  active
                    ? 'border-[#00FFFF]/60 bg-[#00FFFF]/10 text-[#00FFFF]'
                    : 'border-white/10 text-gray-400 hover:border-white/25 hover:text-gray-200'
                }`}
              >
                {pill.label}
              </button>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-gray-500">
        {loading ? (
          'Loading library…'
        ) : (
          <>
            Showing <span style={{ color: NEON }}>{resultCount}</span> of {totalCount} tracks
            {searchQuery.trim() ? ' · search active' : ''}
            {batchFilter !== 'all' ? ` · ${batchFilter} filter` : ''}
            {selectedThemeId ? ' · theme selected' : ''}
          </>
        )}
      </p>
    </section>
  )
}

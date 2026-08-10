'use client'

import { Loader2, Tag, X } from 'lucide-react'
import { ThemeSelect } from './ThemeSelect'
import type { CatalogTheme } from './types'

const NEON = '#00FF66'

export type BulkThemeToolbarProps = {
  selectedCount: number
  themes: CatalogTheme[]
  bulkThemeId: string
  onBulkThemeIdChange: (id: string) => void
  applying: boolean
  onApply: () => void
  onClearSelection: () => void
  themeCounts?: Record<string, number>
}

export function BulkThemeToolbar({
  selectedCount,
  themes,
  bulkThemeId,
  onBulkThemeIdChange,
  applying,
  onApply,
  onClearSelection,
  themeCounts,
}: BulkThemeToolbarProps) {
  if (selectedCount === 0) return null

  return (
    <div
      className="fixed bottom-4 sm:bottom-6 left-1/2 z-50 -translate-x-1/2 w-[calc(100%-1.5rem)] sm:w-[min(100%,42rem)] max-w-[42rem] flex flex-wrap items-center gap-2 sm:gap-3 rounded-xl border border-[#00FF66]/40 bg-[#1E1E1E] md:bg-[#1E1E1E]/95 md:backdrop-blur-md px-3 sm:px-4 py-3 shadow-2xl shadow-black/50 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="toolbar"
      aria-label="Bulk theme assignment"
    >
      <span className="text-sm font-semibold text-white whitespace-nowrap">
        {selectedCount} selected
      </span>

      <ThemeSelect
        value={bulkThemeId}
        onChange={onBulkThemeIdChange}
        themes={themes}
        themeCounts={themeCounts}
        emptyLabel="Move to theme…"
        disabled={applying}
        preferUp
        className="flex-1 min-w-[160px] sm:max-w-56"
        aria-label="Theme to apply"
      />

      <button
        type="button"
        disabled={applying || !bulkThemeId}
        onClick={onApply}
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        style={{ backgroundColor: NEON }}
      >
        {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
        Apply Theme
      </button>

      <button
        type="button"
        onClick={onClearSelection}
        disabled={applying}
        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
        aria-label="Clear selection"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

'use client'

import { Loader2, Tag, X } from 'lucide-react'
import type { CatalogTheme } from './types'

const BG = '#121212'
const NEON = '#00FFFF'

export type BulkThemeToolbarProps = {
  selectedCount: number
  themes: CatalogTheme[]
  bulkThemeId: string
  onBulkThemeIdChange: (id: string) => void
  applying: boolean
  onApply: () => void
  onClearSelection: () => void
}

export function BulkThemeToolbar({
  selectedCount,
  themes,
  bulkThemeId,
  onBulkThemeIdChange,
  applying,
  onApply,
  onClearSelection,
}: BulkThemeToolbarProps) {
  if (selectedCount === 0) return null

  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 w-[min(100%,42rem)] mx-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#00FFFF]/40 bg-[#1E1E1E]/95 backdrop-blur-md px-4 py-3 shadow-2xl shadow-black/50"
      role="toolbar"
      aria-label="Bulk theme assignment"
    >
      <span className="text-sm font-semibold text-white whitespace-nowrap">
        {selectedCount} selected
      </span>

      <select
        value={bulkThemeId}
        onChange={(e) => onBulkThemeIdChange(e.target.value)}
        disabled={applying}
        className="flex-1 min-w-[160px] border border-white/15 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-[#00FFFF] outline-none"
        style={{ backgroundColor: BG }}
        aria-label="Theme to apply"
      >
        <option value="">Choose theme…</option>
        {themes.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

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

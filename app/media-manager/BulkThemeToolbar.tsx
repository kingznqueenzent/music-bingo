'use client'

import { Loader2, Tag, Trash2, X } from 'lucide-react'
import { MASTER_GENRES } from '@/constants/genres'
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
  bulkGenre: string
  onBulkGenreChange: (genre: string) => void
  bulkYear: string
  onBulkYearChange: (year: string) => void
  applyingGenre: boolean
  onApplyGenre: () => void
  deleting?: boolean
  onDeleteSelected?: () => void
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
  bulkGenre,
  onBulkGenreChange,
  bulkYear,
  onBulkYearChange,
  applyingGenre,
  onApplyGenre,
  deleting = false,
  onDeleteSelected,
}: BulkThemeToolbarProps) {
  if (selectedCount === 0) return null

  const busy = applying || applyingGenre || deleting
  const trackLabel = selectedCount === 1 ? 'track' : 'tracks'

  return (
    <div
      className="fixed bottom-4 sm:bottom-6 left-1/2 z-50 -translate-x-1/2 w-[calc(100%-1.5rem)] sm:w-[min(100%,48rem)] max-w-[48rem] flex flex-wrap items-center gap-2 sm:gap-3 rounded-xl border border-[#00FF66]/40 bg-[#1E1E1E] md:bg-[#1E1E1E]/95 md:backdrop-blur-md px-3 sm:px-4 py-3 shadow-2xl shadow-black/50 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="toolbar"
      aria-label="Bulk genre, year, theme, and delete actions"
    >
      <span className="text-sm font-semibold text-white whitespace-nowrap">
        {selectedCount} {trackLabel} selected
      </span>

      <select
        value={bulkGenre}
        onChange={(e) => onBulkGenreChange(e.target.value)}
        disabled={busy}
        aria-label="Target genre"
        className="flex-1 min-w-[9rem] sm:max-w-44 rounded-lg border border-[#00FF66]/25 bg-black/40 px-2.5 py-2 text-sm font-semibold text-[#00FF66]/90 min-h-10 disabled:opacity-50"
      >
        <option value="">Target genre…</option>
        {MASTER_GENRES.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-2 min-w-[7.5rem]">
        <span className="sr-only">Set year</span>
        <input
          type="number"
          inputMode="numeric"
          min={1900}
          max={2100}
          placeholder="Set year"
          value={bulkYear}
          onChange={(e) => onBulkYearChange(e.target.value)}
          disabled={busy}
          aria-label="Set year"
          className="w-[6.5rem] rounded-lg border border-white/15 bg-black/40 px-2.5 py-2 text-sm font-semibold tabular-nums text-white min-h-10 disabled:opacity-50 placeholder:text-white/35"
        />
      </label>

      <button
        type="button"
        disabled={busy || (!bulkGenre && !bulkYear.trim())}
        onClick={onApplyGenre}
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        style={{ backgroundColor: NEON }}
      >
        {applyingGenre ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
        Apply to Selected
      </button>

      {onDeleteSelected ? (
        <button
          type="button"
          disabled={busy}
          onClick={onDeleteSelected}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
          aria-label={`Delete ${selectedCount} selected ${trackLabel}`}
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Delete Selected
        </button>
      ) : null}

      <ThemeSelect
        value={bulkThemeId}
        onChange={onBulkThemeIdChange}
        themes={themes}
        themeCounts={themeCounts}
        emptyLabel="Move to theme…"
        disabled={busy}
        preferUp
        className="flex-1 min-w-[140px] sm:max-w-52"
        aria-label="Theme to apply"
      />

      <button
        type="button"
        disabled={busy || !bulkThemeId}
        onClick={onApply}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold border border-[#00FF66]/40 text-[#00FF66] hover:bg-[#00FF66]/10 disabled:opacity-50"
      >
        {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
        Apply Theme
      </button>

      <button
        type="button"
        onClick={onClearSelection}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50"
      >
        <X className="w-4 h-4" />
        Clear Selection
      </button>
    </div>
  )
}

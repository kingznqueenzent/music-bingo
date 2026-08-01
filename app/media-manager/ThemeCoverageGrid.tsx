'use client'

import { LayoutGrid } from 'lucide-react'
import { MEDIA_MANAGER_GENRE_ROWS } from '@/lib/decade-theme-catalog'
import type { CatalogTheme } from './types'

const SURFACE = '#1E1E1E'
const NEON = '#00FFFF'

type Density = 'empty' | 'low' | 'normal'

function density(count: number): Density {
  if (count === 0) return 'empty'
  if (count < 10) return 'low'
  return 'normal'
}

function cardStyles(d: Density, active: boolean): string {
  const base = active ? 'ring-2 ring-[#00FFFF]/50 bg-[#00FFFF]/5 ' : 'bg-black/20 '
  if (d === 'empty') return base + 'border-red-500/45'
  if (d === 'low') return base + 'border-yellow-500/45'
  return base + 'border-[#00FFFF]/40 hover:border-[#00FFFF]/55'
}

function countStyles(d: Density): string {
  if (d === 'empty') return 'text-red-400'
  if (d === 'low') return 'text-yellow-400'
  return 'text-[#00FFFF]'
}

export type ThemeCoverageGridProps = {
  themes: CatalogTheme[]
  themeCounts: Record<string, number>
  unassigned: number
  selectedThemeFilter: string
  selectedGenreFilter: string
  onSelectTheme: (themeId: string) => void
  onSelectGenre: (genreLabel: string) => void
  /** When true, omits outer card chrome (used inside filters panel). */
  embedded?: boolean
}

function genreTrackTotal(themes: CatalogTheme[], themeCounts: Record<string, number>, dbGenre: string): number {
  return themes
    .filter((t) => t.name.includes(dbGenre))
    .reduce((sum, t) => sum + (themeCounts[t.id] ?? 0), 0)
}

export function ThemeCoverageGrid({
  themes,
  themeCounts,
  unassigned,
  selectedThemeFilter,
  selectedGenreFilter,
  onSelectTheme,
  onSelectGenre,
  embedded = false,
}: ThemeCoverageGridProps) {
  const sorted = [...themes].sort(
    (a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name)
  )

  const visibleThemes =
    selectedGenreFilter === ''
      ? sorted
      : sorted.filter((t) => {
          const row = MEDIA_MANAGER_GENRE_ROWS.find((r) => r.label === selectedGenreFilter)
          if (!row) return t.name.toLowerCase().includes(selectedGenreFilter.toLowerCase())
          return t.name.includes(row.dbGenre)
        })

  const Wrapper = embedded ? 'div' : 'section'

  return (
    <Wrapper
      className={
        embedded
          ? 'space-y-4 xl:max-h-[calc(100vh-12rem)] xl:overflow-y-auto'
          : 'rounded-xl border border-white/10 p-4 space-y-4 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto'
      }
      style={embedded ? undefined : { backgroundColor: SURFACE }}
    >
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2">
          <LayoutGrid className="w-4 h-4" style={{ color: NEON }} />
          Theme Coverage
        </h2>
        <p className="text-xs text-gray-500 mt-1">Tracks per genre &amp; theme — click to filter.</p>
        <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400" /> 0
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-400" /> low
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> normal
          </span>
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">By genre</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onSelectGenre('')}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
              selectedGenreFilter === ''
                ? 'border-[#00FFFF]/60 bg-[#00FFFF]/10 text-[#00FFFF]'
                : 'border-white/10 text-gray-400 hover:border-white/25'
            }`}
          >
            All
          </button>
          {MEDIA_MANAGER_GENRE_ROWS.map((row) => {
            const total = genreTrackTotal(themes, themeCounts, row.dbGenre)
            const active = selectedGenreFilter === row.label
            return (
              <button
                key={row.label}
                type="button"
                onClick={() => onSelectGenre(active ? '' : row.label)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  active
                    ? 'border-[#00FFFF]/60 bg-[#00FFFF]/10 text-[#00FFFF]'
                    : 'border-white/10 text-gray-400 hover:border-white/25'
                }`}
                title={`${total} tracks`}
              >
                {row.label}
                <span className="ml-1 opacity-70">({total})</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {visibleThemes.map((t) => {
          const count = themeCounts[t.id] ?? 0
          const d = density(count)
          const active = selectedThemeFilter === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTheme(t.id)}
              className={`p-2.5 rounded-lg border text-left transition-all ${cardStyles(d, active)}`}
              title={t.name}
            >
              <div className="text-[11px] text-gray-400 truncate leading-tight">{t.name}</div>
              <div className={`text-base font-bold mt-0.5 ${countStyles(d)}`}>{count}</div>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => onSelectTheme('uncategorized')}
          className={`p-2.5 rounded-lg border border-white/15 text-left transition-all bg-black/20 ${
            selectedThemeFilter === 'uncategorized' ? 'ring-2 ring-amber-500/50 bg-amber-500/5' : ''
          }`}
        >
          <div className="text-[11px] text-gray-400">Uncategorized</div>
          <div className="text-base font-bold mt-0.5 text-amber-300/90">{unassigned}</div>
        </button>
      </div>

      {selectedThemeFilter !== '' || selectedGenreFilter !== '' ? (
        <button
          type="button"
          onClick={() => {
            onSelectTheme('')
            onSelectGenre('')
          }}
          className="text-xs hover:underline"
          style={{ color: NEON }}
        >
          Clear filters — show all tracks
        </button>
      ) : null}
    </Wrapper>
  )
}

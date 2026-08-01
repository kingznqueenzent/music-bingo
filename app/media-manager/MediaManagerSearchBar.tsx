'use client'

import { Search } from 'lucide-react'

const BG = '#121212'
const NEON = '#00FFFF'

export type MediaManagerSearchBarProps = {
  value: string
  onChange: (value: string) => void
  resultCount: number
  totalCount: number
  loading?: boolean
}

export function MediaManagerSearchBar({
  value,
  onChange,
  resultCount,
  totalCount,
  loading = false,
}: MediaManagerSearchBarProps) {
  return (
    <section
      aria-label="Search library"
      className="p-4 rounded-xl border border-[#00FFFF]/25 shadow-lg shadow-black/20 space-y-2"
      style={{ backgroundColor: '#1E1E1E' }}
    >
      <label htmlFor="media-manager-search" className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Search library
      </label>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
        <input
          id="media-manager-search"
          type="search"
          placeholder="Search title, artist, theme, or audio / YouTube URL…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-white/15 rounded-xl pl-12 pr-4 py-3 text-base focus:border-[#00FFFF] outline-none ring-0 focus:ring-2 focus:ring-[#00FFFF]/20"
          style={{ backgroundColor: BG, color: '#fff' }}
          autoComplete="off"
        />
      </div>
      <p className="text-xs text-gray-500">
        {loading ? (
          'Loading…'
        ) : (
          <>
            Showing <span style={{ color: NEON }}>{resultCount}</span> of {totalCount} tracks
            {value.trim() ? ' · search active' : ''}
          </>
        )}
      </p>
    </section>
  )
}

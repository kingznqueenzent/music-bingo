'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { Genre, Era } from '@/lib/supabase/types'

export function ThemeFilterBar({ genres, eras }: { genres: Genre[]; eras: Era[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const genreSlug = searchParams.get('genre') ?? ''
  const eraId = searchParams.get('era') ?? ''

  if (genres.length === 0 && eras.length === 0) return null

  function updateUrl(genre: string, era: string) {
    const p = new URLSearchParams()
    if (genre) p.set('genre', genre)
    if (era) p.set('era', era)
    const q = p.toString()
    router.push(q ? `/playlists?${q}` : '/playlists')
  }

  return (
    <div className="flex flex-wrap items-center gap-4 mb-8 p-4 rounded-2xl border border-slate-800 bg-slate-900/50">
      <span className="text-slate-400 text-sm font-medium">Filter:</span>
      {genres.length > 0 && (
        <label className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">Genre</span>
          <select
            value={genreSlug}
            onChange={(e) => updateUrl(e.target.value, eraId)}
            className="rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="">All genres</option>
            {genres.map((g) => (
              <option key={g.id} value={g.slug}>{g.name}</option>
            ))}
          </select>
        </label>
      )}
      {eras.length > 0 && (
        <label className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">Era</span>
          <select
            value={eraId}
            onChange={(e) => updateUrl(genreSlug, e.target.value)}
            className="rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="">All eras</option>
            {eras.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createGameFromMediaLibrary } from '@/app/actions/game'
import {
  fetchAllCatalogSongs,
  songHasPlayableSource,
  type CatalogSongListItem,
} from '@/lib/media/fetch-all-songs'
import { filterSongsByBatchTheme } from '@/lib/media/filter-songs-by-batch-theme'
import {
  BATCH_THEME_PILLS,
  type BatchThemeFilter,
} from '@/app/media-manager/MediaManagerFilterBar'
import type { CatalogSong } from '@/app/media-manager/types'
import { withSupabaseKeyHint } from '@/lib/supabase-error-hint'
import { LibrarySearchEmpty } from '@/components/media/LibrarySearchEmpty'
import { type GameTier, TIER_FEATURE_LABELS } from '@/lib/tiers'

const MIN_5X5 = 45
const MIN_4X4 = 32

const TIER_LABELS = TIER_FEATURE_LABELS

export function CreateFromMediaForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const themeFromUrl = searchParams.get('theme')?.trim() ?? ''
  const supabase = createClient()
  const [items, setItems] = useState<CatalogSongListItem[]>([])
  const [themeNameById, setThemeNameById] = useState<Map<string, string>>(new Map())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [name, setName] = useState('')
  const [search, setSearch] = useState('')
  const [batchFilter, setBatchFilter] = useState<BatchThemeFilter>('all')
  const [gridSize, setGridSize] = useState<4 | 5>(5)
  const [tier, setTier] = useState<GameTier>('pro')
  const [loading, setLoading] = useState(false)
  const [loadingList, setLoadingList] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [submitError, setSubmitError] = useState('')

  const minSongs = gridSize === 5 ? MIN_5X5 : MIN_4X4

  const filteredItems = useMemo(() => {
    let list = items as CatalogSong[]
    if (themeFromUrl) {
      list = list.filter((s) => s.theme_id === themeFromUrl)
    }
    const byTheme = filterSongsByBatchTheme(list, themeNameById, batchFilter) as CatalogSongListItem[]
    const q = search.trim().toLowerCase()
    if (!q) return byTheme
    return byTheme.filter((s) => {
      const title = s.title.toLowerCase()
      const artist = (s.artist ?? '').toLowerCase()
      const theme = (s.theme_id ? themeNameById.get(s.theme_id) ?? '' : '').toLowerCase()
      return title.includes(q) || artist.includes(q) || theme.includes(q)
    })
  }, [items, search, batchFilter, themeNameById, themeFromUrl])

  const selectedThemeName = themeFromUrl ? themeNameById.get(themeFromUrl) ?? null : null

  const playableSelected = useMemo(() => {
    let n = 0
    for (const id of selected) {
      const song = items.find((s) => s.id === id)
      if (song && songHasPlayableSource(song)) n += 1
    }
    return n
  }, [selected, items])

  const canSubmit = playableSelected >= minSongs && name.trim().length > 0

  async function loadLibrary() {
    setLoadError('')
    setLoadingList(true)
    const [{ songs, error }, themesResult] = await Promise.all([
      fetchAllCatalogSongs(supabase),
      supabase.from('themes').select('id, name').order('name'),
    ])
    if (themesResult.data) {
      setThemeNameById(new Map(themesResult.data.map((t) => [t.id, t.name])))
    }
    if (error) {
      setLoadError(withSupabaseKeyHint(error))
      setItems([])
    } else {
      setItems(songs)
      setSelected((prev) => {
        const next = new Set<string>()
        const ids = new Set(songs.map((s) => s.id))
        for (const id of prev) {
          if (ids.has(id)) next.add(id)
        }
        return next
      })
    }
    setLoadingList(false)
  }

  useEffect(() => {
    void loadLibrary()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, [])

  useEffect(() => {
    const onFocus = () => void loadLibrary()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllFiltered() {
    const playableFiltered = filteredItems.filter(songHasPlayableSource)
    const allSelected =
      playableFiltered.length > 0 && playableFiltered.every((s) => selected.has(s.id))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        playableFiltered.forEach((s) => next.delete(s.id))
      } else {
        playableFiltered.forEach((s) => next.add(s.id))
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')
    if (!canSubmit) return
    setLoading(true)
    const playableIds = [...selected].filter((id) => {
      const song = items.find((s) => s.id === id)
      return song && songHasPlayableSource(song)
    })
    const result = await createGameFromMediaLibrary(name.trim() || 'Media Bingo', playableIds, {
      gridSize,
      tier,
    })
    setLoading(false)
    if (result.error) {
      setSubmitError(withSupabaseKeyHint(result.error))
      return
    }
    if (result.game?.id) {
      router.push(`/host/${result.game.id}?code=${encodeURIComponent(result.code ?? '')}`)
    }
  }

  const playableCount = items.filter(songHasPlayableSource).length

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {selectedThemeName ? (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100 flex flex-wrap items-center justify-between gap-2">
          <span>
            Showing songs for <strong>{selectedThemeName}</strong>
          </span>
          <Link href="/themes" className="text-cyan-300 hover:text-white underline-offset-2 hover:underline">
            Browse themes
          </Link>
        </div>
      ) : null}
      <div>
        <label className="block text-lg mb-2 text-slate-200">Playlist / game name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. My Mix"
          className="w-full p-4 rounded-2xl bg-slate-800/60 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/50"
        />
      </div>

      <div>
        <label className="block text-lg mb-2 text-slate-200">Tier (Media Library requires Pro+)</label>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as GameTier)}
          className="w-full max-w-xs p-3 rounded-xl bg-slate-800 border border-slate-600 text-slate-200 text-sm mb-4"
        >
          {(['pro', 'enterprise'] as const).map((t) => (
            <option key={t} value={t}>
              {TIER_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-lg text-slate-200">Grid size</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="gridSize"
                checked={gridSize === 5}
                onChange={() => setGridSize(5)}
                className="rounded"
              />
              <span className="text-slate-200">5×5 (min {MIN_5X5})</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="gridSize"
                checked={gridSize === 4}
                onChange={() => setGridSize(4)}
                className="rounded"
              />
              <span className="text-slate-200">4×4 (min {MIN_4X4})</span>
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6 min-w-0 overflow-hidden">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-slate-100">Select tracks</h2>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-slate-400 text-sm">
              {loadingList ? 'Loading…' : `${items.length} in catalog`}
              {!loadingList ? ` · ${playableCount} playable` : ''}
              {' · '}
              {playableSelected} selected (need {minSongs})
            </span>
            <button
              type="button"
              onClick={() => void loadLibrary()}
              disabled={loadingList}
              className="text-sm font-medium px-3 py-2 min-h-10 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 disabled:opacity-50 touch-manipulation"
            >
              {loadingList ? 'Loading…' : 'Refresh list'}
            </button>
            <button
              type="button"
              onClick={selectAllFiltered}
              className="text-sm font-medium text-emerald-400 hover:text-emerald-300 min-h-10 touch-manipulation"
            >
              Select all playable (filtered)
            </button>
          </div>
        </div>

        <label htmlFor="create-media-search" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Search library
        </label>
        <input
          id="create-media-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search titles, artists, genres…"
          className="w-full mt-1 mb-3 p-3.5 min-h-12 rounded-xl bg-slate-800/60 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          autoComplete="off"
          spellCheck={false}
        />

        <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="Theme filter">
          {BATCH_THEME_PILLS.map((pill) => {
            const active = batchFilter === pill.id
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setBatchFilter(pill.id)}
                className={`rounded-full px-3 py-2 min-h-10 text-sm font-medium border transition-colors touch-manipulation ${
                  active
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-slate-800/60 border-slate-600 text-slate-300 hover:border-slate-500'
                }`}
              >
                {pill.label}
              </button>
            )
          })}
        </div>

        {loadError ? <p className="text-red-300 text-sm mb-4">{loadError}</p> : null}
        {items.length === 0 && !loadError && !loadingList ? (
          <p className="text-slate-500 py-4">
            No tracks in the songs catalog. Import or upload in the{' '}
            <a href="/media-manager" className="text-emerald-400 hover:underline">
              Media Manager
            </a>
            , then click <strong>Refresh list</strong>.
          </p>
        ) : null}
        {loadingList && items.length === 0 ? (
          <p className="text-slate-500 py-4">Loading full catalog (may take a moment)…</p>
        ) : null}

        {!loadingList && items.length > 0 && filteredItems.length === 0 ? (
          <LibrarySearchEmpty
            query={search}
            onClear={() => {
              setSearch('')
              setBatchFilter('all')
            }}
            message="No catalog tracks match your search or theme filter."
          />
        ) : (
          <ul className="max-h-[min(28rem,55dvh)] overflow-y-auto overscroll-contain space-y-1 -mx-1 px-1">
            {filteredItems.map((item) => {
              const playable = songHasPlayableSource(item)
              const label = item.artist ? `${item.title} — ${item.artist}` : item.title
              const theme = item.theme_id ? themeNameById.get(item.theme_id) : null
              return (
                <li
                  key={item.id}
                  className={`flex items-center gap-2 py-2.5 px-3 rounded-lg hover:bg-slate-800/50 min-w-0 ${
                    !playable ? 'opacity-50' : ''
                  }`}
                >
                  <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggle(item.id)}
                      disabled={!playable}
                      className="rounded border-slate-500 text-emerald-500 focus:ring-emerald-500 shrink-0 disabled:opacity-40 min-h-5 min-w-5"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="text-slate-200 block truncate" title={label}>
                        {label}
                      </span>
                      {theme ? (
                        <span className="text-slate-500 text-xs truncate block">{theme}</span>
                      ) : null}
                    </span>
                    <span className="text-slate-500 text-xs shrink-0 uppercase">
                      {playable ? item.media_type : 'no media'}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
        {filteredItems.length > 0 ? (
          <p className="text-slate-500 text-xs mt-3">
            Showing {filteredItems.length} of {items.length} catalog tracks
            {search.trim() || batchFilter !== 'all' ? ' (filtered)' : ''}
          </p>
        ) : null}
      </div>

      {submitError ? <p className="text-red-300 text-sm">{submitError}</p> : null}

      <button
        type="submit"
        disabled={loading || !canSubmit}
        className="w-full rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-xl font-semibold py-4 px-8 shadow-xl shadow-emerald-500/40 transition-transform hover:scale-[1.02] disabled:hover:scale-100"
      >
        {loading ? 'Creating…' : 'Create game & get link'}
      </button>
    </form>
  )
}

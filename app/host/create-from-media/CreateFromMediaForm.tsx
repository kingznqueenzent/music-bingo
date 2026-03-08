'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createGameFromMediaLibrary } from '@/app/actions/game'
import { mediaDisplayName } from '@/lib/media-display'
import { withSupabaseKeyHint } from '@/lib/supabase-error-hint'
import { type GameTier } from '@/lib/tiers'
import type { MediaLibraryItem } from '@/lib/supabase/types'

const MIN_5X5 = 45
const MIN_4X4 = 32

const TIER_LABELS: Record<GameTier, string> = {
  free: 'Free (10 players)',
  pro: 'Pro (50 players)',
  enterprise: 'Enterprise (unlimited + branding)',
}

export function CreateFromMediaForm() {
  const router = useRouter()
  const supabase = createClient()
  const [items, setItems] = useState<MediaLibraryItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [name, setName] = useState('')
  const [gridSize, setGridSize] = useState<4 | 5>(5)
  const [tier, setTier] = useState<GameTier>('pro')
  const [loading, setLoading] = useState(false)
  const [loadingList, setLoadingList] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [removingId, setRemovingId] = useState<string | null>(null)

  const minSongs = gridSize === 5 ? MIN_5X5 : MIN_4X4
  const canSubmit = selected.size >= minSongs && name.trim().length > 0

  async function loadLibrary() {
    setLoadError('')
    setLoadingList(true)
    const { data, error } = await supabase
      .from('media_library')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      setLoadError(withSupabaseKeyHint(error.message))
      setItems([])
    } else {
      setItems((data ?? []) as MediaLibraryItem[])
    }
    setLoadingList(false)
  }

  useEffect(() => {
    loadLibrary()
  }, [])

  useEffect(() => {
    const onFocus = () => loadLibrary()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    if (selected.size === items.length) setSelected(new Set())
    else setSelected(new Set(items.map((i) => i.id)))
  }

  async function removeFromLibrary(item: MediaLibraryItem) {
    if (removingId) return
    setRemovingId(item.id)
    setLoadError('')
    try {
      const { error: deleteRowError } = await supabase.from('media_library').delete().eq('id', item.id)
      if (deleteRowError) throw new Error(deleteRowError.message)
      if (item.file_path && item.file_type !== 'spotify') {
        await supabase.storage.from('media').remove([item.file_path])
      }
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
      await loadLibrary()
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to remove track')
    } finally {
      setRemovingId(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')
    if (!canSubmit) return
    setLoading(true)
    const result = await createGameFromMediaLibrary(name.trim() || 'Media Bingo', [...selected], {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
            <option key={t} value={t}>{TIER_LABELS[t]}</option>
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

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-slate-100">Select tracks</h2>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm">
              {items.length} in library · {selected.size} selected (need {minSongs})
            </span>
            <button
              type="button"
              onClick={() => loadLibrary()}
              disabled={loadingList}
              className="text-sm font-medium px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 disabled:opacity-50"
            >
              {loadingList ? 'Loading…' : 'Refresh list'}
            </button>
            <button
              type="button"
              onClick={selectAll}
              className="text-sm font-medium text-emerald-400 hover:text-emerald-300"
            >
              {selected.size === items.length ? 'Clear all' : 'Select all'}
            </button>
          </div>
        </div>
        {loadError && (
          <p className="text-red-300 text-sm mb-4">{loadError}</p>
        )}
        {items.length === 0 && !loadError && !loadingList && (
          <p className="text-slate-500 py-4">
            No files in Media Library. Upload MP3 or MP4 in the{' '}
            <a href="/media" className="text-emerald-400 hover:underline">Media Manager</a>, then click <strong>Refresh list</strong>.
          </p>
        )}
        {loadingList && items.length === 0 && (
          <p className="text-slate-500 py-4">Loading tracks…</p>
        )}
        <ul className="max-h-80 overflow-y-auto space-y-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-slate-800/50 group">
              <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggle(item.id)}
                  className="rounded border-slate-500 text-emerald-500 focus:ring-emerald-500 shrink-0"
                />
                <span className="text-slate-200 truncate" title={item.name}>{mediaDisplayName(item)}</span>
                <span className="text-slate-500 text-sm shrink-0">{item.file_type.toUpperCase()}</span>
              </label>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); removeFromLibrary(item) }}
                disabled={removingId === item.id}
                title="Remove from library"
                className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium text-red-400/90 hover:text-red-300 hover:bg-red-500/20 border border-red-500/30 disabled:opacity-50"
              >
                {removingId === item.id ? (
                  <span className="text-xs">Removing…</span>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Remove</span>
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {submitError && (
        <p className="text-red-300 text-sm">{submitError}</p>
      )}

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

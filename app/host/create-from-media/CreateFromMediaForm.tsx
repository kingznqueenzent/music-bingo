'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createGameFromMediaLibrary } from '@/app/actions/game'
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
  const [loadError, setLoadError] = useState('')
  const [submitError, setSubmitError] = useState('')

  const minSongs = gridSize === 5 ? MIN_5X5 : MIN_4X4
  const canSubmit = selected.size >= minSongs && name.trim().length > 0

  useEffect(() => {
    async function load() {
      setLoadError('')
      const { data, error } = await supabase
        .from('media_library')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) {
        setLoadError(error.message)
        setItems([])
      } else {
        setItems((data ?? []) as MediaLibraryItem[])
      }
    }
    load()
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
      setSubmitError(result.error)
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-100">Select tracks</h2>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm">
              {selected.size} selected (need {minSongs})
            </span>
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
        {items.length === 0 && !loadError && (
          <p className="text-slate-500 py-4">
            No files in Media Library. Upload MP3 or MP4 in the{' '}
            <a href="/media" className="text-emerald-400 hover:underline">Media Manager</a> first.
          </p>
        )}
        <ul className="max-h-80 overflow-y-auto space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <label className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-800/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggle(item.id)}
                  className="rounded border-slate-500 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-slate-200 truncate flex-1">{item.name}</span>
                <span className="text-slate-500 text-sm shrink-0">{item.file_type.toUpperCase()}</span>
              </label>
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

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createGame } from '@/app/actions/game'
import { type GameTier } from '@/lib/tiers'

const MIN_5X5 = 45
const MIN_4X4 = 32

const TIER_LABELS: Record<GameTier, string> = {
  free: 'Free (10 players – great for testing)',
  pro: 'Pro (50 players)',
  enterprise: 'Enterprise (unlimited + branding)',
}

export function HostCreateForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [urlsText, setUrlsText] = useState('')
  const [gridSize, setGridSize] = useState<4 | 5>(5)
  const [tier, setTier] = useState<GameTier>('free')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const minSongs = gridSize === 5 ? MIN_5X5 : MIN_4X4

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const urls = urlsText
      .split(/[\n\r]+/)
      .map((u) => u.trim())
      .filter(Boolean)
    if (urls.length < minSongs) {
      setError(`Add at least ${minSongs} YouTube links for a ${gridSize}×${gridSize} grid (got ${urls.length}).`)
      return
    }
    setLoading(true)
    const result = await createGame(name || 'Music Bingo', urls, { gridSize, tier })
    setLoading(false)
    if (result.error) {
      setError(result.error)
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
          placeholder="e.g. 90s Hits"
          className="w-full p-4 rounded-2xl bg-slate-800/60 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/50"
        />
      </div>
      <div>
        <label className="block text-lg mb-2 text-slate-200">Tier</label>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as GameTier)}
          className="w-full max-w-xs p-3 rounded-xl bg-slate-800 border border-slate-600 text-slate-200 text-sm"
        >
          {(['free', 'pro', 'enterprise'] as const).map((t) => (
            <option key={t} value={t}>{TIER_LABELS[t]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-lg mb-2 text-slate-200">Grid size</label>
        <div className="flex gap-4 mb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="gridSize"
              checked={gridSize === 5}
              onChange={() => setGridSize(5)}
              className="rounded"
            />
            <span className="text-slate-200">5×5 (min {MIN_5X5} songs)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="gridSize"
              checked={gridSize === 4}
              onChange={() => setGridSize(4)}
              className="rounded"
            />
            <span className="text-slate-200">4×4 (min {MIN_4X4} songs)</span>
          </label>
        </div>
      </div>
      <div>
        <label className="block text-lg mb-2 text-slate-200">
          YouTube links (one per line, min {minSongs})
        </label>
        <textarea
          value={urlsText}
          onChange={(e) => setUrlsText(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=...&#10;https://youtu.be/..."
          rows={12}
          className="w-full p-4 rounded-2xl bg-slate-800/60 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/50 resize-y font-mono text-sm"
        />
      </div>
      {error && <p className="text-red-300">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-xl font-semibold py-4 px-8 shadow-xl shadow-emerald-500/40 transition-transform hover:scale-[1.02] disabled:hover:scale-100"
      >
        {loading ? 'Creating…' : 'Create game & get link'}
      </button>
    </form>
  )
}

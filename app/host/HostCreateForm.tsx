'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createGame } from '@/app/actions/game'
import { type GameTier, TIER_FEATURE_LABELS } from '@/lib/tiers'
import { withSupabaseKeyHint } from '@/lib/supabase-error-hint'

const MIN_5X5 = 45
const MIN_4X4 = 32

function parseYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

const TIER_LABELS = TIER_FEATURE_LABELS

const fieldClass =
  'w-full p-4 rounded-2xl lg-neon-input text-white placeholder-white/35 resize-y font-mono text-sm'
const labelClass = 'block text-sm font-semibold mb-2 text-white/80'

export function HostCreateForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [urlsText, setUrlsText] = useState('')
  const [gridSize, setGridSize] = useState<4 | 5>(5)
  const [tier, setTier] = useState<GameTier>('free')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const minSongs = gridSize === 5 ? MIN_5X5 : MIN_4X4

  const parsedSongs = useMemo(() => {
    return urlsText
      .split(/[\n\r]+/)
      .map((u) => u.trim())
      .filter(Boolean)
      .map((url, i) => ({ index: i + 1, url, id: parseYoutubeId(url) }))
  }, [urlsText])

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
      setError(withSupabaseKeyHint(result.error))
      return
    }
    if (result.game?.id) {
      router.push(`/host/${result.game.id}?code=${encodeURIComponent(result.code ?? '')}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className={labelClass}>Playlist / game name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. 90s Hits"
          className={`${fieldClass} font-sans text-base`}
        />
      </div>
      <div>
        <label className={labelClass}>Tier</label>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as GameTier)}
          className="w-full max-w-xs p-3 rounded-xl lg-neon-input text-sm"
        >
          {(['free', 'pro', 'enterprise'] as const).map((t) => (
            <option key={t} value={t} className="bg-[#1E1E1E]">
              {TIER_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Grid size</label>
        <div className="flex flex-wrap gap-4 mb-2">
          <label className="flex items-center gap-2 cursor-pointer text-white/80">
            <input
              type="radio"
              name="gridSize"
              checked={gridSize === 5}
              onChange={() => setGridSize(5)}
              className="accent-[#00FF66]"
            />
            <span>5×5 (min {MIN_5X5} songs)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-white/80">
            <input
              type="radio"
              name="gridSize"
              checked={gridSize === 4}
              onChange={() => setGridSize(4)}
              className="accent-[#00FF66]"
            />
            <span>4×4 (min {MIN_4X4} songs)</span>
          </label>
        </div>
      </div>
      <div>
        <label className={labelClass}>
          YouTube links (one per line, min {minSongs})
        </label>
        <textarea
          value={urlsText}
          onChange={(e) => setUrlsText(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=...&#10;https://youtu.be/..."
          rows={10}
          className={fieldClass}
        />
        {parsedSongs.length > 0 && (
          <div className="mt-2 rounded-xl border border-white/10 bg-black/25 p-3">
            <p className="text-white/60 text-sm font-medium mb-2">
              Songs you’re adding ({parsedSongs.length}) — names will show after the game is created
            </p>
            <ul className="max-h-40 overflow-y-auto space-y-1 text-sm font-mono">
              {parsedSongs.slice(0, 50).map(({ index, id }) => (
                <li key={`${index}-${id}`} className="text-white/45">
                  <span className="text-white/30">{index}.</span>{' '}
                  {id ? (
                    <span className="text-[#00FF66]/90">Video ID: {id}</span>
                  ) : (
                    <span className="text-amber-400/90">Invalid link (skipped)</span>
                  )}
                </li>
              ))}
              {parsedSongs.length > 50 && (
                <li className="text-white/30">… and {parsedSongs.length - 50} more</li>
              )}
            </ul>
          </div>
        )}
      </div>
      {error ? <p className="text-red-300">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full lg-neon-btn text-xl py-4 px-8 disabled:hover:scale-100"
      >
        {loading ? 'Creating…' : 'Create game & get link'}
      </button>
    </form>
  )
}

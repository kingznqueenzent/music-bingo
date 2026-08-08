'use client'

import Link from 'next/link'
import { Loader2, RefreshCw } from 'lucide-react'
import { useThemeTrackCounts } from '@/hooks/useThemeTrackCounts'
import { formatTrackCountLabel } from '@/lib/media/theme-track-counts'

/** Featured theme shortcuts shown first on the Host “Load songs” panel. */
const FEATURED_THEMES = [
  { id: 'a1000000-0000-0000-0000-000000000016', fallbackName: "90's Hip-Hop" },
  { id: 'a1000000-0000-0000-0000-000000000015', fallbackName: "90's Reggae" },
  { id: 'a1000000-0000-0000-0000-000000000017', fallbackName: "80's Rock" },
  { id: 'a1000000-0000-0000-0000-000000000018', fallbackName: "2000's Dancehall" },
  { id: 'a1000000-0000-0000-0000-000000000019', fallbackName: 'Afrobeats 2010–2026' },
] as const

function TrackCountBadge({ count }: { count: number }) {
  const empty = count === 0
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums border ${
        empty
          ? 'border-slate-600 text-slate-500 bg-slate-800/60'
          : 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
      }`}
    >
      {formatTrackCountLabel(count)}
    </span>
  )
}

function ThemeActionCard({
  href,
  name,
  count,
  loading,
}: {
  href: string
  name: string
  count: number
  loading?: boolean
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-3 font-medium text-slate-100 hover:border-emerald-500/50 hover:bg-slate-700/80 transition-colors min-h-12 inline-flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 touch-manipulation"
    >
      <span className="leading-tight">{name}</span>
      {loading ? (
        <span className="text-[11px] text-slate-500">…</span>
      ) : (
        <TrackCountBadge count={count} />
      )}
    </Link>
  )
}

/**
 * Host Dashboard “Load songs into a theme” picker with live track-count badges.
 */
export function HostThemeLoadPanel() {
  const { themes, countById, loading, error, refetch } = useThemeTrackCounts()

  const featuredIds = new Set(FEATURED_THEMES.map((t) => t.id))
  const featured = FEATURED_THEMES.map(({ id, fallbackName }) => {
    const row = themes.find((t) => t.id === id)
    return {
      id,
      name: row?.name ?? fallbackName,
      count: countById.get(id) ?? 0,
    }
  })

  const rest = themes.filter((t) => !featuredIds.has(t.id))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold mb-2 text-slate-50">Load songs into a theme</h2>
          <p className="text-slate-400 text-sm">
            Pick a theme, then add YouTube links or upload MP3/MP4 so they show up in the right section
            for players. Counts update when tracks are uploaded, imported, or deleted.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={loading}
          className="inline-flex items-center gap-2 min-h-11 rounded-xl border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:border-slate-500 touch-manipulation disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      {error ? (
        <p className="text-amber-300 text-sm rounded-xl border border-amber-500/30 bg-amber-950/20 px-3 py-2">
          {error}
        </p>
      ) : null}

      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">YouTube import</p>
        <div className="flex flex-wrap gap-3 mb-3">
          {featured.map((t) => (
            <ThemeActionCard
              key={`yt-${t.id}`}
              href={`/host/import-youtube?theme=${t.id}`}
              name={`${t.name} (YouTube)`}
              count={t.count}
              loading={loading && themes.length === 0}
            />
          ))}
          <Link
            href="/host/import-youtube"
            className="rounded-xl border border-slate-600 bg-slate-800/80 px-5 py-3 font-medium text-slate-400 hover:border-slate-500 hover:bg-slate-700/80 transition-colors min-h-12 inline-flex items-center"
          >
            All themes…
          </Link>
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">MP3 / MP4 (Media)</p>
        <div className="flex flex-wrap gap-3 mb-3">
          {featured.map((t) => (
            <ThemeActionCard
              key={`media-${t.id}`}
              href={`/media-manager?theme=${t.id}`}
              name={`${t.name} (MP3/MP4)`}
              count={t.count}
              loading={loading && themes.length === 0}
            />
          ))}
          <Link
            href="/media-manager"
            className="rounded-xl border border-slate-600 bg-slate-800/80 px-5 py-3 font-medium text-slate-400 hover:border-slate-500 hover:bg-slate-700/80 transition-colors min-h-12 inline-flex items-center"
          >
            Media Manager (all)
          </Link>
        </div>
      </div>

      {rest.length > 0 ? (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
            All themes ({themes.length})
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto overscroll-contain pr-1">
            {rest.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/host/import-youtube?theme=${t.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-700/80 bg-slate-950/40 px-3 py-2.5 min-h-11 hover:border-emerald-500/40 transition-colors"
                >
                  <span className="text-sm text-slate-200 truncate">{t.name}</span>
                  <TrackCountBadge count={t.trackCount} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

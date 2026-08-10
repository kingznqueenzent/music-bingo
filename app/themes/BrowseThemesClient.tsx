'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowLeft, Guitar, Loader2, Mic2, Music, Search } from 'lucide-react'
import { motion } from 'motion/react'
import { useThemeTrackCounts } from '@/hooks/useThemeTrackCounts'
import type { ThemeWithTrackCount } from '@/lib/media/theme-track-counts'
import {
  BROWSE_ERA_PILLS,
  BROWSE_GENRE_PILLS,
  browseThemeHostHref,
  browseThemeIconKind,
  formatSongCountLabel,
  parseEraFromThemeName,
  themeMatchesEra,
  themeMatchesGenre,
  themeMatchesSearch,
  type BrowseEraFilter,
  type BrowseGenreFilter,
  type BrowseThemeIcon,
} from '@/lib/browse-themes'

const NEON = 'var(--lg-neon)'
const SURFACE = 'var(--lg-surface)'

function FilterPills<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly T[]
  value: T
  onChange: (next: T) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = value === option
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`text-sm px-3.5 py-1.5 rounded-full border transition-colors touch-manipulation min-h-9 ${
                active
                  ? 'border-[#00FF66]/60 bg-[#00FF66]/10 text-[#00FF66]'
                  : 'border-white/10 text-white/55 hover:border-white/25 hover:text-white/80'
              }`}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ThemeIcon({ kind }: { kind: BrowseThemeIcon }) {
  const className = 'w-8 h-8'
  const style = { color: NEON }
  if (kind === 'mic') return <Mic2 className={className} style={style} aria-hidden />
  if (kind === 'guitar') return <Guitar className={className} style={style} aria-hidden />
  return <Music className={className} style={style} aria-hidden />
}

function ThemeBrowseCard({
  theme,
  index,
}: {
  theme: ThemeWithTrackCount
  index: number
}) {
  const era = parseEraFromThemeName(theme.name)
  const iconKind = browseThemeIconKind(theme.name)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.025, 0.35) }}
    >
      <Link
        href={browseThemeHostHref(theme.id)}
        className="group flex flex-col h-full rounded-2xl border border-white/10 px-4 py-5 transition-colors hover:border-[#00FF66]/40 hover:bg-[#00FF66]/5 touch-manipulation"
        style={{ backgroundColor: SURFACE }}
      >
        <div className="flex justify-center mb-4 py-3">
          <div className="w-14 h-14 rounded-full border border-white/10 bg-black/25 flex items-center justify-center group-hover:border-[#00FF66]/30 transition-colors">
            <ThemeIcon kind={iconKind} />
          </div>
        </div>
        <h3 className="text-base font-bold text-white text-center leading-snug mb-1">{theme.name}</h3>
        {era ? (
          <p className="text-[11px] uppercase tracking-wider text-white/40 text-center mb-4">{era}</p>
        ) : (
          <p className="text-[11px] uppercase tracking-wider text-white/25 text-center mb-4">Theme</p>
        )}
        <p className="mt-auto text-center text-sm text-white/55 tabular-nums pt-2 border-t border-white/5">
          {formatSongCountLabel(theme.trackCount)}
        </p>
      </Link>
    </motion.div>
  )
}

export function BrowseThemesClient() {
  const { themes, loading, error, refetch } = useThemeTrackCounts()
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState<BrowseGenreFilter>('All')
  const [era, setEra] = useState<BrowseEraFilter>('All')

  const filtered = useMemo(() => {
    return themes.filter(
      (t) =>
        themeMatchesSearch(t.name, search) &&
        themeMatchesGenre(t.name, genre) &&
        themeMatchesEra(t.name, era)
    )
  }, [themes, search, genre, era])

  return (
    <main className="min-h-dvh lg-surface-canvas overflow-x-hidden pb-16">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <header className="space-y-3 pb-2 border-b border-white/5">
          <div className="flex items-start gap-3">
            <Link
              href="/host"
              className="h-9 w-9 rounded-lg border border-white/10 flex items-center justify-center text-white/60 hover:text-[#00FF66] hover:border-[#00FF66]/30 transition-colors shrink-0 mt-0.5"
              aria-label="Back to host dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Browse Themes</h1>
              <p className="text-white/45 text-sm mt-1">Pick a theme to host a game</p>
            </div>
          </div>
        </header>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/35 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search themes..."
            className="w-full rounded-xl border border-white/12 bg-black/20 pl-12 pr-4 py-3.5 text-base text-white placeholder:text-white/35 lg-neon-input min-h-12"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="lg-surface-card rounded-2xl p-4 sm:p-5 space-y-5">
          <FilterPills label="Genre" options={BROWSE_GENRE_PILLS} value={genre} onChange={setGenre} />
          <FilterPills label="Era" options={BROWSE_ERA_PILLS} value={era} onChange={setEra} />
        </div>

        {error ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-amber-200 text-sm flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void refetch()}
              className="text-[#00FF66] hover:underline text-sm font-medium"
            >
              Retry
            </button>
          </div>
        ) : null}

        {loading && themes.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-20 text-white/45">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--lg-neon)]" />
            Loading themes…
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-white/40 py-16">
            {themes.length === 0
              ? 'No themes in the catalog yet.'
              : 'No themes match your filters. Try clearing search or choosing All.'}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((theme, index) => (
              <ThemeBrowseCard key={theme.id} theme={theme} index={index} />
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 ? (
          <p className="text-center text-xs text-white/30">
            {filtered.length} theme{filtered.length === 1 ? '' : 's'} · tap a card to create a game
          </p>
        ) : null}
      </div>
    </main>
  )
}

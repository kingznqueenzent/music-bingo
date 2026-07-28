import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getThemesDirect, getGenresDirect, getErasDirect } from '@/lib/db'
import { ThemeFilterBar } from './ThemeFilterBar'
import type { Theme, Genre, Era } from '@/lib/supabase/types'
import { sortThemesChronologicalThenGenre } from '@/lib/sort-themes'

/** Base44: playlist categories in order by year + genre (no duplicates). */
const ORDERED_PLAYLIST_CATEGORIES: { eraName: string; genreName: string }[] = [
  { eraName: '70s', genreName: 'Rock' },
  { eraName: '80s', genreName: 'Rock' },
  { eraName: '90s', genreName: 'Rock' },
  { eraName: '2000s', genreName: 'Rock' },
  { eraName: '70s', genreName: 'R&B & Soul' },
  { eraName: '80s', genreName: 'R&B & Soul' },
  { eraName: '80s', genreName: 'Reggae' },
  { eraName: '90s', genreName: 'Reggae' },
  { eraName: '80s', genreName: 'Pop' },
  { eraName: '90s', genreName: 'Pop' },
]

async function getThemes(): Promise<{ themes: Theme[]; error?: { message: string; code?: string } }> {
  if (process.env.DATABASE_URL) {
    const { themes, error: directError } = await getThemesDirect()
    if (themes.length > 0) return { themes }
    return {
      themes: [],
      error: {
        message: directError
          ? `Database: ${directError}`
          : 'No themes in database. Run supabase/seed-themes.sql in Supabase SQL Editor.',
      },
    }
  }
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('themes')
      .select('id, name, category, description, artwork_url, genre_id, era_id')
      .order('name')
    if (!error) return { themes: (data ?? []) as Theme[] }
    const code = (error as { code?: string }).code
    return { themes: [], error: { message: error.message, code } }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { themes: [], error: { message: msg } }
  }
}

async function getGenres(): Promise<Genre[]> {
  if (process.env.DATABASE_URL) {
    const { genres } = await getGenresDirect()
    return genres
  }
  try {
    const supabase = createClient()
    const { data } = await supabase.from('genres').select('id, name, slug, sort_order').order('sort_order')
    return (data ?? []) as Genre[]
  } catch {
    return []
  }
}

async function getEras(): Promise<Era[]> {
  if (process.env.DATABASE_URL) {
    const { eras } = await getErasDirect()
    return eras
  }
  try {
    const supabase = createClient()
    const { data } = await supabase.from('eras').select('id, name, start_year, end_year, sort_order').order('sort_order')
    return (data ?? []) as Era[]
  } catch {
    return []
  }
}

type PlaylistsPageProps = { searchParams: Promise<{ hostError?: string; genre?: string; era?: string }> }

export default async function PlaylistsPage({ searchParams }: PlaylistsPageProps) {
  const params = await searchParams
  const hostError = params?.hostError
  const genreSlug = params?.genre ?? ''
  const eraId = params?.era ?? ''

  let themes: Theme[] = []
  let error: { message: string; code?: string } | undefined
  let genres: Genre[] = []
  let eras: Era[] = []
  try {
    const [result, genresRes, erasRes] = await Promise.all([getThemes(), getGenres(), getEras()])
    themes = result.themes
    error = result.error
    genres = genresRes
    eras = erasRes
  } catch (e) {
    error = { message: e instanceof Error ? e.message : String(e) }
  }

  if (genreSlug && genres.length > 0) {
    const genreId = genres.find((g) => g.slug === genreSlug)?.id
    if (genreId) themes = themes.filter((t) => t.genre_id === genreId)
  }
  if (eraId) {
    themes = themes.filter((t) => t.era_id === eraId)
  }

  themes = sortThemesChronologicalThenGenre(themes, eras, genres)

  // Base44: group by era + genre in fixed order (70's Rock, 80's Rock, … 90's Pop); rest in "Other"
  const eraIdByName = new Map(eras.map((e) => [e.name, e.id]))
  const genreIdByName = new Map(genres.map((g) => [g.name, g.id]))
  const categoryByKey = new Map<string, { title: string; order: number }>()
  ORDERED_PLAYLIST_CATEGORIES.forEach(({ eraName, genreName }, i) => {
    const eid = eraIdByName.get(eraName)
    const gid = genreIdByName.get(genreName)
    if (eid && gid) categoryByKey.set(`${eid}:${gid}`, { title: `${eraName}'s ${genreName}`, order: i })
  })
  const orderedGroups: { title: string; order: number; themes: Theme[] }[] = []
  const otherThemes: Theme[] = []
  for (const t of themes) {
    const key = t.era_id && t.genre_id ? `${t.era_id}:${t.genre_id}` : null
    const cat = key ? categoryByKey.get(key) : null
    if (cat) {
      let group = orderedGroups.find((g) => g.title === cat.title)
      if (!group) {
        group = { title: cat.title, order: cat.order, themes: [] }
        orderedGroups.push(group)
      }
      group.themes.push(t)
    } else {
      otherThemes.push(t)
    }
  }
  orderedGroups.sort((a, b) => a.order - b.order)
  if (otherThemes.length > 0) {
    orderedGroups.push({ title: 'Other', order: 999, themes: otherThemes })
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-6 pt-6">
        <Link href="/lyricgrid" className="text-slate-300 hover:text-white text-sm">
          ← Back to Home
        </Link>
      </div>
      <section className="max-w-5xl mx-auto px-6 pt-8 pb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-center mb-3">
          Community Playlists
        </h1>
        <p className="text-center text-slate-300 max-w-2xl mx-auto">
          Let your community pick the vibe. Choose a curated theme and start a
          game in seconds.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-20 space-y-12">
        <ThemeFilterBar genres={genres} eras={eras} />
        {hostError && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-100">
            <p className="font-semibold">Could not host game</p>
            <p className="text-sm mt-2 font-mono break-words">{decodeURIComponent(hostError)}</p>
            <p className="text-sm mt-3 text-amber-200/90">
              Add at least 25 songs to the theme (e.g. with the YouTube playlist script) and try again.
            </p>
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-100">
            <p className="font-semibold">Couldn’t load themes.</p>
            <p className="text-sm mt-2 font-mono break-words">
              {error.code ? `[${error.code}] ` : ''}
              {error.message}
            </p>
            <p className="text-sm mt-3 text-red-200/90">
              {error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo') ? (
                <>
                  Use the <strong>Session mode</strong> (pooler) connection string from Supabase: Database →
                  Configuration → Connection string → <strong>Session</strong>. It uses a host like{' '}
                  <code className="font-mono">aws-0-us-east-1.pooler.supabase.com</code> and port <strong>6543</strong>.
                  Put that full URI in <code className="font-mono">.env.local</code> as <code className="font-mono">DATABASE_URL</code>.
                </>
              ) : (
                <>
                  Check <code className="font-mono">DATABASE_URL</code> in .env.local (Supabase → Database →
                  Configuration → Connection string).
                </>
              )}
            </p>
          </div>
        )}

        {orderedGroups.map((group) => (
          <CategorySection key={group.title} title={group.title} themes={group.themes} genres={genres} eras={eras} />
        ))}

        {!error && themes.length === 0 && (
          <p className="text-center text-slate-400">
            No themes yet. Add some in Supabase by inserting rows into the{' '}
            <code className="font-mono">themes</code> table.
          </p>
        )}
      </section>
    </main>
  )
}

function CategorySection({
  title,
  themes,
  genres,
  eras,
}: {
  title: string
  themes: Theme[]
  genres: Genre[]
  eras: Era[]
}) {
  if (!themes || themes.length === 0) return null
  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-slate-50">{title}</h2>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {themes.map((theme) => (
          <ThemeCard key={theme.id} theme={theme} genres={genres} eras={eras} />
        ))}
      </div>
    </div>
  )
}

function ThemeCard({
  theme,
  genres,
  eras,
}: {
  theme: Theme
  genres: Genre[]
  eras: Era[]
}) {
  const genreName = theme.genre_name ?? (theme.genre_id ? genres.find((g) => g.id === theme.genre_id)?.name : null)
  const eraName = theme.era_name ?? (theme.era_id ? eras.find((e) => e.id === theme.era_id)?.name : null)
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-md shadow-black/40 flex flex-col overflow-hidden">
      {theme.artwork_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={theme.artwork_url}
          alt={theme.name}
          className="h-32 w-full object-cover"
        />
      ) : (
        <div className="h-32 w-full bg-gradient-to-r from-emerald-500/40 via-sky-500/30 to-violet-500/40" />
      )}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <h3 className="text-lg font-semibold text-slate-50">{theme.name}</h3>
          {(genreName || eraName) && (
            <p className="text-xs text-slate-500 mt-0.5">
              {[genreName, eraName].filter(Boolean).join(' · ')}
            </p>
          )}
          {theme.description && (
            <p className="text-xs text-slate-300 mt-1 line-clamp-3">{theme.description}</p>
          )}
        </div>
        <p className="mt-auto text-center text-slate-500 text-sm py-2">
          Hosting by invite only — get a game code from your host to join.
        </p>
      </div>
    </div>
  )
}


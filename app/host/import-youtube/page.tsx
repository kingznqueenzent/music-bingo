import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getThemesDirect, getGenresDirect, getErasDirect } from '@/lib/db'
import { ImportYouTubeForm } from './ImportYouTubeForm'
import type { Theme, Genre, Era } from '@/lib/supabase/types'
import { sortThemesChronologicalThenGenre } from '@/lib/sort-themes'

async function getThemesSorted(): Promise<Theme[]> {
  if (process.env.DATABASE_URL) {
    const { themes } = await getThemesDirect()
    if (themes.length > 0) return themes
  }
  const supabase = createClient()
  const [{ data: themeRows }, { data: genreRows }, { data: eraRows }] = await Promise.all([
    supabase
      .from('themes')
      .select('id, name, category, description, artwork_url, genre_id, era_id'),
    supabase.from('genres').select('id, name, slug, sort_order'),
    supabase.from('eras').select('id, name, start_year, end_year, sort_order'),
  ])
  return sortThemesChronologicalThenGenre(
    (themeRows ?? []) as Theme[],
    (eraRows ?? []) as Era[],
    (genreRows ?? []) as Genre[]
  )
}

export default async function ImportYouTubePage({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string }>
}) {
  const themes = await getThemesSorted()
  const { theme: themeIdFromUrl } = await searchParams

  return (
    <main className="min-h-dvh bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 md:p-8 text-white">
      <div className="max-w-2xl mx-auto">
        <Link href="/host" className="text-slate-300 hover:text-white text-sm mb-4 inline-block">
          ← Back to Host
        </Link>
        <h1 className="text-3xl font-extrabold text-slate-100 mb-2">
          Import YouTube songs
        </h1>
        <p className="text-slate-400 mb-8">
          Choose the theme where songs will go, then add links. Songs appear under that theme for players.
        </p>
        <ImportYouTubeForm themes={themes} initialThemeId={themeIdFromUrl ?? undefined} />
      </div>
    </main>
  )
}

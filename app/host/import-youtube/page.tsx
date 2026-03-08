import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getThemesDirect } from '@/lib/db'
import { ImportYouTubeForm } from './ImportYouTubeForm'
import type { Theme } from '@/lib/supabase/types'

async function getThemes(): Promise<Theme[]> {
  if (process.env.DATABASE_URL) {
    const { themes } = await getThemesDirect()
    if (themes.length > 0) return themes
  }
  const supabase = createClient()
  const { data } = await supabase
    .from('themes')
    .select('id, name, category, description, artwork_url')
    .order('name')
  return (data ?? []) as Theme[]
}

function sortThemesFirst(themes: Theme[]): Theme[] {
  return [...themes].sort((a, b) => {
    const a90 = a.name.startsWith('90') ? 0 : 1
    const b90 = b.name.startsWith('90') ? 0 : 1
    if (a90 !== b90) return a90 - b90
    return a.name.localeCompare(b.name)
  })
}

export default async function ImportYouTubePage({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string }>
}) {
  const rawThemes = await getThemes()
  const themes = sortThemesFirst(rawThemes)
  const { theme: themeIdFromUrl } = await searchParams

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 md:p-8 text-white">
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

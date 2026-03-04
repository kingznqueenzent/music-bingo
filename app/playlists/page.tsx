import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createGameFromTheme } from '@/app/actions/game'
import { getThemesDirect } from '@/lib/db'
import type { Theme } from '@/lib/supabase/types'

async function getThemes(): Promise<{ themes: Theme[]; error?: { message: string; code?: string } }> {
  // When DATABASE_URL is set, use direct Postgres first (avoids broken Supabase API schema cache).
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
      .select('id, name, category, description, artwork_url')
      .order('name')

    if (!error) return { themes: (data ?? []) as Theme[] }
    const code = (error as { code?: string }).code
    return { themes: [], error: { message: error.message, code } }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { themes: [], error: { message: msg } }
  }
}

type PlaylistsPageProps = { searchParams: Promise<{ hostError?: string }> }

export default async function PlaylistsPage({ searchParams }: PlaylistsPageProps) {
  const params = await searchParams
  const hostError = params?.hostError

  let themes: Theme[] = []
  let error: { message: string; code?: string } | undefined
  try {
    const result = await getThemes()
    themes = result.themes
    error = result.error
  } catch (e) {
    error = { message: e instanceof Error ? e.message : String(e) }
  }

  const grouped: Record<string, Theme[]> = {
    decade: [],
    genre: [],
    mood: [],
  }
  for (const t of themes) {
    const cat = (t.category as 'decade' | 'genre' | 'mood') ?? 'decade'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(t)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-6 pt-6">
        <Link href="/" className="text-slate-300 hover:text-white text-sm">
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

        <CategorySection title="Decades" label="decade" themes={grouped.decade} />
        <CategorySection title="Genres" label="genre" themes={grouped.genre} />
        <CategorySection title="Mood & Events" label="mood" themes={grouped.mood} />

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
  label,
  themes,
}: {
  title: string
  label: string
  themes: Theme[]
}) {
  if (!themes || themes.length === 0) return null
  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-slate-50">{title}</h2>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {themes.map((theme) => (
          <ThemeCard key={theme.id} theme={theme} />
        ))}
      </div>
    </div>
  )
}

function ThemeCard({ theme }: { theme: Theme }) {
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
          {theme.description && (
            <p className="text-xs text-slate-300 mt-1 line-clamp-3">{theme.description}</p>
          )}
        </div>
        <form action={hostTheme} className="mt-auto">
          <input type="hidden" name="themeId" value={theme.id} />
          <button
            type="submit"
            className="w-full rounded-full bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-sm font-semibold text-white shadow-emerald-500/40 shadow-lg transition-transform hover:scale-[1.02]"
          >
            Host this theme
          </button>
        </form>
      </div>
    </div>
  )
}

async function hostTheme(formData: FormData) {
  'use server'
  const themeId = formData.get('themeId')
  if (!themeId || typeof themeId !== 'string') {
    redirect('/playlists')
  }

  const result = await createGameFromTheme(themeId)
  if (!result || result.error || !result.game) {
    const message = result?.error ?? 'Could not start game'
    redirect(`/playlists?hostError=${encodeURIComponent(message)}`)
  }

  redirect(`/host/${result.game.id}?code=${encodeURIComponent(result.code ?? '')}`)
}


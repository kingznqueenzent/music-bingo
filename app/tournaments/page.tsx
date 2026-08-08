import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isFeatureEnabled } from '@/lib/feature-flags'
import type { Tournament } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TournamentsIndexPage() {
  const supabase = createClient()
  if (!(await isFeatureEnabled(supabase, 'tournaments'))) {
    notFound()
  }
  const { data } = await supabase
    .from('tournaments')
    .select('id, name, status, start_date, end_date, format')
    .order('start_date', { ascending: false })
    .limit(50)

  const rows = (data ?? []) as Tournament[]

  return (
    <main className="min-h-dvh bg-slate-950 text-white flex flex-col items-center p-6 md:p-12">
      <div className="w-full max-w-3xl">
        <h1 className="text-4xl font-black text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200">
          Tournaments
        </h1>
        <p className="text-slate-400 text-center mb-10">
          Seasonal series — register, then play eligible games during the window. Standings update live.
        </p>

        {rows.length === 0 ? (
          <p className="text-slate-500 text-center">No tournaments yet. Hosts can create one from the Host Dashboard.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tournaments/${t.id}`}
                  className="block rounded-2xl border border-slate-700 bg-slate-900/60 px-5 py-4 hover:border-amber-500/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold text-lg text-white">{t.name}</span>
                    <span className="text-xs uppercase text-amber-400/90 shrink-0">{t.status}</span>
                  </div>
                  <p className="text-slate-500 text-sm mt-1">
                    {t.start_date} — {t.end_date} · {t.format}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-10 text-center">
          <Link href="/lyricgrid" className="text-slate-400 hover:text-white">
            ← Home
          </Link>
        </p>
      </div>
    </main>
  )
}

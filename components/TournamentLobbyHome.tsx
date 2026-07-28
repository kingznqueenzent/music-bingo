import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isFeatureEnabled } from '@/lib/feature-flags'
import type { Tournament } from '@/lib/supabase/types'

export async function TournamentLobbyHome() {
  const supabase = createClient()
  if (!(await isFeatureEnabled(supabase, 'tournaments'))) {
    return null
  }

  const { data } = await supabase
    .from('tournaments')
    .select('id, name, status, start_date, end_date, prize_description')
    .in('status', ['upcoming', 'active'])
    .order('start_date', { ascending: true })
    .limit(6)

  const rows = (data ?? []) as Tournament[]

  return (
    <section className="max-w-5xl mx-auto px-6 pb-12 w-full">
      <div className="rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-950/80 to-slate-950/90 p-8 md:p-10">
        <h2 className="text-2xl md:text-3xl font-black text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-amber-200">
          Tournament lobby
        </h2>
        <p className="text-slate-400 text-center mb-8 max-w-2xl mx-auto">
          Register for seasonal series, earn standings, and compete for prizes when tournaments are live.
        </p>
        {rows.length === 0 ? (
          <p className="text-center text-slate-500 mb-6">No upcoming tournaments right now. Check back soon.</p>
        ) : (
          <ul className="space-y-3 mb-8">
            {rows.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tournaments/${t.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-500/20 bg-slate-900/50 px-5 py-4 hover:border-violet-400/50 transition-colors"
                >
                  <span className="font-semibold text-white">{t.name}</span>
                  <span className="text-xs uppercase text-violet-300/90">{t.status}</span>
                  <span className="text-sm text-slate-500 w-full sm:w-auto">
                    {t.start_date} — {t.end_date}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-center">
          <Link
            href="/tournaments"
            className="inline-flex rounded-full border border-violet-400/60 px-8 py-3 font-semibold text-violet-100 hover:bg-violet-500/15 transition-colors"
          >
            All tournaments
          </Link>
        </div>
      </div>
    </section>
  )
}

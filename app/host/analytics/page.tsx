import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { getHostAnalyticsSnapshot } from '@/lib/host-analytics'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function HostAnalyticsPage() {
  const supabase = createClient()
  if (!(await isFeatureEnabled(supabase, 'host_analytics'))) {
    notFound()
  }

  const snap = await getHostAnalyticsSnapshot(supabase)

  return (
    <main className="min-h-dvh bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-10">
        <div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-emerald-400">
            Host analytics
          </h1>
          <p className="text-slate-400 mt-2">Aggregated LyricGrid usage across your deployment.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard title="Total games" value={String(snap.totalGames)} />
          <StatCard title="Avg players / game" value={String(snap.avgPlayersPerGame)} />
          <StatCard title="Prize claims (logistics)" value={String(snap.prizesClaimed)} />
          <StatCard title="Peak play day" value={snap.peakDayLabel} subtitle="from join activity sample" />
          <StatCard title="Peak play hour" value={snap.peakHourLabel} subtitle="local timezone" />
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Popular themes</h2>
          {snap.popularThemes.length === 0 ? (
            <p className="text-slate-500">No themed games recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {snap.popularThemes.map((t) => (
                <li key={t.name} className="flex justify-between gap-4 text-slate-200">
                  <span>{t.name}</span>
                  <span className="text-slate-500">{t.count} games</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Top returning players</h2>
          {snap.topReturning.length === 0 ? (
            <p className="text-slate-500">No leaderboard data yet.</p>
          ) : (
            <ul className="space-y-2">
              {snap.topReturning.map((p) => (
                <li key={p.identifier} className="flex flex-wrap justify-between gap-2 text-slate-200">
                  <span className="font-medium">{p.player_name}</span>
                  <span className="text-slate-400">{p.games_played} games played</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-center">
          <Link href="/host" className="text-green-400 hover:text-green-300">
            ← Host dashboard
          </Link>
        </p>
      </div>
    </main>
  )
}

function StatCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <p className="text-xs uppercase tracking-widest text-slate-500">{title}</p>
      <p className="text-3xl font-bold text-white mt-1">{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-2">{subtitle}</p>}
    </div>
  )
}

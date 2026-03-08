import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { LeaderboardEntry } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getTopPlayers(limit: number): Promise<LeaderboardEntry[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('leaderboard')
    .select('id, player_name, identifier, wins, points, last_played, created_at, updated_at')
    .order('points', { ascending: false })
    .limit(limit)
  if (error) return []
  return (data ?? []) as LeaderboardEntry[]
}

export default async function LeaderboardPage() {
  const players = await getTopPlayers(10)

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl md:text-6xl font-black text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">
          LEADERBOARD
        </h1>
        <p className="text-slate-400 text-center text-lg md:text-xl mb-10">
          Top 10 by points — Stage ready
        </p>

        <div className="rounded-2xl border-2 border-amber-500/40 bg-slate-900/90 shadow-2xl overflow-hidden">
          {players.length === 0 ? (
            <div className="py-20 text-center text-slate-500 text-xl md:text-2xl">
              No scores yet. Win a game and claim your spot!
            </div>
          ) : (
            <ul className="divide-y divide-slate-700/80">
              {players.map((p, i) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-4 px-6 py-4 md:py-5 bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                >
                  <span className="text-2xl md:text-4xl font-bold text-amber-400/90 w-10 md:w-14 shrink-0">
                    #{i + 1}
                  </span>
                  <span className="text-xl md:text-3xl font-bold text-white flex-1 truncate">
                    {p.player_name}
                  </span>
                  <span className="text-lg md:text-2xl font-semibold text-amber-300/90 shrink-0">
                    {p.points} pts
                  </span>
                  <span className="text-base md:text-xl text-slate-400 shrink-0">
                    {p.wins} win{p.wins !== 1 ? 's' : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-slate-400 hover:text-white text-lg transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  )
}

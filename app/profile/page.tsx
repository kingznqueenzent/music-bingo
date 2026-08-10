import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { getLevelFromXp } from '@/lib/xp-levels'
import { BADGE_DEFINITIONS } from '@/lib/badge-definitions'
import type { LeaderboardEntry } from '@/lib/supabase/types'
import { PremiumProfileActions } from '@/components/PremiumProfileActions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const BADGE_EMOJI: Record<string, string> = {
  first_timer: '🎵',
  on_fire: '🔥',
  dedicated: '💎',
  unbreakable: '👑',
  first_win: '🏆',
  hat_trick: '⚡',
  sharp_shooter: '🎯',
  lyric_legend: '🌟',
  tournament_champion: '🥇',
  tournament_finalist: '🎖️',
  tournament_veteran: '🗓️',
  premium_patron: '💎',
  chatterbox: '💬',
  community_pillar: '🤝',
}

type ProfilePageProps = { searchParams: Promise<{ identifier?: string }> }

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const { identifier: rawId } = await searchParams
  const identifier = rawId?.trim() ?? ''

  let profile: LeaderboardEntry | null = null
  const supabase = createClient()
  const xpOn = await isFeatureEnabled(supabase, 'xp_and_badges')
  const premiumOn = await isFeatureEnabled(supabase, 'premium_player_pass')
  if (identifier) {
    const { data } = await supabase
      .from('leaderboard')
      .select(
        'id, player_name, identifier, wins, points, total_xp, games_played, streak_current, streak_best, last_played_week, badges, last_played, created_at, updated_at, premium_subscriber'
      )
      .eq('identifier', identifier)
      .maybeSingle()
    profile = data as LeaderboardEntry | null
  }

  const xp = profile ? profile.total_xp ?? profile.points ?? 0 : 0
  const level = getLevelFromXp(xp)
  const nextAt = level.nextAt
  const progressPct =
    nextAt != null ? Math.min(100, Math.max(0, ((xp - level.minXp) / (nextAt - level.minXp)) * 100)) : 100
  const badgeDefs = new Map(BADGE_DEFINITIONS.map((b) => [b.id, b]))
  const earnedIds = profile?.badges ?? []
  const earnedBadges = earnedIds
    .map((id) => {
      const def = badgeDefs.get(id)
      return def ? { ...def, emoji: BADGE_EMOJI[id] ?? '⭐' } : null
    })
    .filter(Boolean) as Array<
    (typeof BADGE_DEFINITIONS)[number] & { emoji: string }
  >

  return (
    <main className="min-h-dvh bg-slate-950 text-white flex flex-col items-center p-6 md:p-12">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-black text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-emerald-400">
          Player profile
        </h1>
        <p className="text-slate-400 text-center mb-10">
          {xpOn
            ? 'Enter your LyricGrid player identifier (same as when you join a game) to see XP, level, streaks, and badges.'
            : 'Enter your LyricGrid player identifier to see your public stats.'}
        </p>

        {identifier && premiumOn && <PremiumProfileActions identifier={identifier} />}

        <form method="get" className="flex flex-col sm:flex-row gap-3 mb-10">
          <input
            name="identifier"
            type="text"
            defaultValue={identifier}
            placeholder="Your identifier"
            className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            className="rounded-xl bg-green-600 hover:bg-green-500 font-semibold px-6 py-3 text-white shrink-0"
          >
            Load profile
          </button>
        </form>

        {!identifier ? (
          <p className="text-slate-500 text-center">Add <code className="text-slate-400">?identifier=…</code> or use the field above.</p>
        ) : !profile ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-8 text-center text-slate-400">
            No profile found for that identifier yet.{xpOn ? ' Play a game to start earning XP.' : ''}
          </div>
        ) : !xpOn ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-xl">
            <h2 className="text-sm uppercase tracking-widest text-slate-400 mb-1">Player</h2>
            <p className="text-3xl font-bold text-white mb-4">{profile.player_name}</p>
            <p className="text-slate-300">
              Wins: <span className="font-semibold text-amber-300">{profile.wins}</span>
            </p>
            <p className="text-slate-500 text-sm mt-4">
              XP, streaks, and badges are turned off for this deployment.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <section
              className={`rounded-2xl border bg-slate-900/80 p-6 shadow-xl ${
                premiumOn && profile.premium_subscriber
                  ? 'border-sky-400/60 ring-2 ring-sky-400/30 ring-offset-2 ring-offset-slate-950'
                  : 'border-green-500/30'
              }`}
            >
              <h2 className="text-sm uppercase tracking-widest text-green-400/80 mb-1">Player</h2>
              <p className="text-3xl font-bold text-white mb-4">{profile.player_name}</p>
              {premiumOn && profile.premium_subscriber && (
                <p className="text-sky-300 text-sm font-semibold mb-4">✨ Premium member — 1.5× XP on games</p>
              )}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Level {level.level}</span>
                  {nextAt != null ? <span>Next level at {nextAt} XP</span> : <span>Max level</span>}
                </div>
                <div className="h-3 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-slate-500">Total XP</dt>
                  <dd className="text-2xl font-semibold text-amber-300">{xp}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Level</dt>
                  <dd className="text-2xl font-semibold text-emerald-300">
                    {level.level}{' '}
                    <span className="text-lg font-normal text-slate-300">— {level.title}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Games played</dt>
                  <dd className="text-xl text-slate-200">{profile.games_played ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Wins</dt>
                  <dd className="text-xl text-slate-200">{profile.wins}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Current streak</dt>
                  <dd className="text-xl text-slate-200">{profile.streak_current ?? 0} weeks</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Best streak</dt>
                  <dd className="text-xl text-slate-200">{profile.streak_best ?? 0} weeks</dd>
                </div>
              </dl>
              {profile.last_played_week && (
                <p className="mt-4 text-xs text-slate-500">Last played week: {profile.last_played_week}</p>
              )}
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span>Badges</span>
                <span className="text-slate-500 text-sm font-normal">({earnedBadges.length})</span>
              </h2>
              {earnedBadges.length === 0 ? (
                <p className="text-slate-500">No badges yet — keep playing weekly and winning rounds.</p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {earnedBadges.map((b) => (
                    <li
                      key={b.id}
                      className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 flex gap-3 items-start"
                    >
                      <span className="text-3xl shrink-0" aria-hidden>
                        {b.emoji}
                      </span>
                      <div>
                        <p className="font-semibold text-white">{b.name}</p>
                        <p className="text-sm text-slate-400">{b.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        <div className="mt-12 flex flex-wrap justify-center gap-6 text-slate-400">
          {xpOn && (
            <Link href="/leaderboard" className="hover:text-white transition-colors">
              Leaderboard
            </Link>
          )}
          <Link href="/lyricgrid" className="hover:text-white transition-colors">
            Home
          </Link>
        </div>
      </div>
    </main>
  )
}

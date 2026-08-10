'use client'

import Link from 'next/link'
import { FeatureGate } from '@/components/FeatureGate'

export function HomeCtas() {
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-2">
      <a
        href="/join"
        className="inline-flex items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-400 px-8 py-3 text-lg font-semibold shadow-xl shadow-emerald-500/40 transition-transform hover:scale-105"
      >
        Join a Game
      </a>
      <a
        href="/playlists"
        className="inline-flex items-center justify-center rounded-full border border-slate-600/80 px-8 py-3 text-lg font-semibold text-slate-100 hover:border-slate-300 hover:bg-slate-900/60 transition-colors"
      >
        Browse Playlists
      </a>
      <FeatureGate flag="xp_and_badges">
        <a
          href="/leaderboard"
          className="inline-flex items-center justify-center rounded-full border border-amber-500/60 px-8 py-3 text-lg font-semibold text-amber-200 hover:border-amber-400 hover:bg-amber-500/20 transition-colors"
        >
          Leaderboard
        </a>
      </FeatureGate>
      <FeatureGate flag="tournaments">
        <Link
          href="/tournaments"
          className="inline-flex items-center justify-center rounded-full border border-violet-500/60 px-8 py-3 text-lg font-semibold text-violet-200 hover:border-violet-400 hover:bg-violet-500/15 transition-colors"
        >
          Tournaments
        </Link>
      </FeatureGate>
      <FeatureGate flag="community_chat">
        <Link
          href="/community"
          className="inline-flex items-center justify-center rounded-full border border-green-500/60 px-8 py-3 text-lg font-semibold text-green-200 hover:border-green-400 hover:bg-green-500/10 transition-colors"
        >
          Community Hub
        </Link>
      </FeatureGate>
    </div>
  )
}

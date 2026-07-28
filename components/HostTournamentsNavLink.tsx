'use client'

import { FeatureGate } from '@/components/FeatureGate'

export function HostTournamentsNavLink() {
  return (
    <FeatureGate flag="tournaments">
      <a
        href="/host/tournaments"
        className="rounded-2xl border border-amber-600/50 bg-slate-900/70 px-8 py-4 text-lg font-semibold text-amber-100 hover:border-amber-400/60 hover:bg-slate-800/70 transition-colors"
      >
        🏆 Seasonal tournaments
      </a>
    </FeatureGate>
  )
}

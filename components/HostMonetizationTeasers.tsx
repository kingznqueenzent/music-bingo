'use client'

import Link from 'next/link'
import { FeatureGate } from '@/components/FeatureGate'

/** B2B / monetization entry points on the host landing page */
export function HostMonetizationTeasers() {
  return (
    <div className="mt-8 flex flex-col gap-3 max-w-2xl w-full">
      <FeatureGate flag="venue_packages">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90">
          <span className="font-semibold">Venue packages</span> — Free for hosting; Pro unlocks the media library;
          Enterprise adds custom branding.{' '}
          <Link href="/venue-packages" className="underline hover:text-white">
            Open packages
          </Link>
        </div>
      </FeatureGate>
      <FeatureGate flag="paid_entry_games">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-100/90">
          <span className="font-semibold">Paid entry & prize pools</span> — ticketed games and pooled prizes.
        </div>
      </FeatureGate>
      <FeatureGate flag="premium_player_pass">
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 px-4 py-3 text-sm text-sky-100/90">
          <span className="font-semibold">Premium player pass</span> — subscriptions and perks for regular players.
        </div>
      </FeatureGate>
      <FeatureGate flag="sponsor_integration">
        <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/5 px-4 py-3 text-sm text-fuchsia-100/90">
          <span className="font-semibold">Sponsors</span> — brand mystery envelopes and partner placements.{' '}
          <Link href="/kingz-control" className="underline hover:text-white">
            KingzControl
          </Link>
        </div>
      </FeatureGate>
    </div>
  )
}

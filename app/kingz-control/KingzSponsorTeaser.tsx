'use client'

import { FeatureGate } from '@/components/FeatureGate'

export function KingzSponsorTeaser() {
  return (
    <FeatureGate flag="sponsor_integration">
      <div className="rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/5 px-4 py-3 text-sm text-fuchsia-100/90 mb-8">
        <span className="font-semibold">Sponsor integrations</span> — mystery envelopes and partner branding (configure when
        enabled).
      </div>
    </FeatureGate>
  )
}

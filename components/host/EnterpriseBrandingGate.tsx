'use client'

import type { ReactNode } from 'react'
import { useHostTier } from '@/app/media-manager/hooks/useHostTier'
import { EnterpriseBrandingUpgradeModal } from '@/components/media/EnterpriseBrandingUpgradeModal'

/** Renders children for Enterprise hosts; Free/Pro see an inline upgrade prompt. */
export function EnterpriseBrandingGate({ children }: { children: ReactNode }) {
  const hostTier = useHostTier(0)

  if (hostTier.loading) return null

  if (!hostTier.hasBrandingAccess) {
    return (
      <div className="mt-6 pt-6 border-t border-slate-700 space-y-4">
        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Venue branding</h4>
        <EnterpriseBrandingUpgradeModal
          open
          onClose={() => {}}
          tier={hostTier.tier}
          modal={false}
        />
      </div>
    )
  }

  return <>{children}</>
}

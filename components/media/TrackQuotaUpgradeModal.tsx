'use client'

import Link from 'next/link'
import { X, Sparkles, Building2 } from 'lucide-react'
import type { GameTier } from '@/lib/tiers'
import { FREE_TIER_TRACK_LIMIT } from '@/lib/media/track-quota'

type TrackQuotaUpgradeModalProps = {
  open: boolean
  onClose: () => void
  tier?: GameTier
  currentCount?: number
  message?: string
}

const PLANS = [
  {
    id: 'pro',
    name: 'Pro',
    icon: Sparkles,
    highlight: 'Unlimited tracks',
    features: ['Unlimited media library', 'Custom playlists', 'Stage leaderboard', 'Priority support'],
    href: '/venue-packages',
    cta: 'View Pro packages',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: Building2,
    highlight: 'Unlimited + white-label',
    features: ['Unlimited media library', 'Venue branding', 'Sponsor slots', 'Dedicated success manager'],
    href: '/venue-packages',
    cta: 'Contact for Enterprise',
  },
] as const

export function TrackQuotaUpgradeModal({
  open,
  onClose,
  tier = 'free',
  currentCount,
  message,
}: TrackQuotaUpgradeModalProps) {
  if (!open) return null

  const defaultMessage =
    tier === 'free'
      ? `Your Free plan includes up to ${FREE_TIER_TRACK_LIMIT} tracks in the media library${
          currentCount != null ? ` (${currentCount} / ${FREE_TIER_TRACK_LIMIT} used)` : ''
        }. Upgrade to add more.`
      : 'Your media library has reached its track limit. Upgrade for unlimited storage.'

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="track-quota-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-[#00FFFF]/25 bg-[#1E1E1E] shadow-[0_0_48px_rgba(0,255,255,0.12)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-white/5 bg-[#121212]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#00FFFF]/70 mb-1">
              Library limit reached
            </p>
            <h2 id="track-quota-modal-title" className="text-lg font-bold text-white">
              Upgrade your plan
            </h2>
            <p className="text-sm text-white/50 mt-1">{message ?? defaultMessage}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 h-9 w-9 rounded-lg border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {PLANS.map((plan) => {
            const Icon = plan.icon
            return (
              <div
                key={plan.id}
                className="rounded-xl border border-white/10 bg-[#121212] p-4 hover:border-[#00FFFF]/30 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-[#00FFFF]" />
                  <span className="font-bold text-white">{plan.name}</span>
                  <span className="text-[10px] uppercase tracking-wide text-[#00FFFF]/80 font-semibold ml-auto">
                    {plan.highlight}
                  </span>
                </div>
                <ul className="text-xs text-white/45 space-y-1 mb-3">
                  {plan.features.map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className="inline-flex items-center justify-center w-full rounded-lg bg-gradient-to-r from-[#00FFFF] to-cyan-400 text-[#121212] font-semibold text-sm py-2.5 hover:from-cyan-300 hover:to-[#00FFFF] transition-all"
                  onClick={onClose}
                >
                  {plan.cta}
                </Link>
              </div>
            )
          })}
        </div>

        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full text-sm text-white/40 hover:text-white/60 py-2 transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}

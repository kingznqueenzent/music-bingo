'use client'

import Link from 'next/link'
import { X, Building2, Sparkles, Palette, CheckCircle2 } from 'lucide-react'
import type { GameTier } from '@/lib/tiers'

type EnterpriseBrandingUpgradeModalProps = {
  open: boolean
  onClose: () => void
  tier?: GameTier
  message?: string
  /** When false, renders inline wall content without overlay. */
  modal?: boolean
}

const ENTERPRISE_BRANDING_FEATURES = [
  'Custom venue logo & display name',
  'Brand colors on join, stage & player cards',
  'Hide LyricGrid branding on player screens',
  'Everything in Pro (unlimited media library)',
] as const

export function EnterpriseBrandingUpgradeModal({
  open,
  onClose,
  tier = 'free',
  message,
  modal = true,
}: EnterpriseBrandingUpgradeModalProps) {
  if (!open || tier === 'enterprise') return null

  const defaultMessage =
    tier === 'pro'
      ? 'Custom branding is included with Enterprise. Upgrade to white-label your venue on join, stage, and player screens.'
      : 'Custom branding requires Enterprise. Upgrade for venue logos, brand colors, and hidden LyricGrid branding.'

  const body = (
    <>
      <div className={`flex items-start justify-between gap-3 ${modal ? 'px-5 pt-5 pb-3 border-b border-white/5 bg-[#121212]' : ''}`}>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#00FF66]/70 mb-1">
            Enterprise feature
          </p>
          <h2 id="enterprise-branding-upgrade-title" className="text-lg font-bold text-white">
            Upgrade to Enterprise
          </h2>
          <p className="text-sm text-white/50 mt-1">{message ?? defaultMessage}</p>
        </div>
        {modal ? (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 h-9 w-9 rounded-lg border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      <div className={`space-y-3 ${modal ? 'p-5' : 'mt-4'}`}>
        {tier === 'pro' ? (
          <div className="rounded-xl border border-[#00FF66]/35 bg-[#00FF66]/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#00FF66]" />
              <span className="font-bold text-white">Pro</span>
              <span className="text-[10px] uppercase tracking-wide text-white/50 font-semibold ml-auto">
                Current plan
              </span>
            </div>
            <p className="text-xs text-white/45">Unlimited media library included. Branding is Enterprise-only.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-[#121212] p-4">
            <p className="text-xs text-white/45">
              Free includes game hosting. Pro unlocks the media library; Enterprise adds white-label branding.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-white/10 bg-[#121212] p-4 hover:border-[#00FF66]/30 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-[#00FF66]" />
            <span className="font-bold text-white">Enterprise</span>
            <span className="text-[10px] uppercase tracking-wide text-[#00FF66]/80 font-semibold ml-auto flex items-center gap-1">
              <Palette className="w-3 h-3" />
              Custom branding
            </span>
          </div>
          <ul className="text-xs text-white/45 space-y-1 mb-3">
            {ENTERPRISE_BRANDING_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-[#00FF66]/70 shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/venue-packages"
            className="inline-flex items-center justify-center w-full rounded-lg bg-gradient-to-r from-[#00FF66] to-green-400 text-[#121212] font-semibold text-sm py-2.5 hover:from-green-300 hover:to-[#00FF66] transition-all"
            onClick={onClose}
          >
            Contact for Enterprise
          </Link>
        </div>
      </div>
    </>
  )

  if (!modal) {
    return (
      <div
        className="rounded-xl border border-slate-600 bg-slate-800/50 p-4 space-y-3"
        role="region"
        aria-labelledby="enterprise-branding-upgrade-title"
      >
        {body}
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="enterprise-branding-upgrade-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-[#00FF66]/25 bg-[#1E1E1E] shadow-[0_0_48px_rgba(0,255,102,0.12)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {body}
      </div>
    </div>
  )
}

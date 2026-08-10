'use client'

import Link from 'next/link'
import { X, Sparkles, Music2, CheckCircle2 } from 'lucide-react'
import type { GameTier } from '@/lib/tiers'

type MediaLibraryUpgradeModalProps = {
  open: boolean
  onClose: () => void
  tier?: GameTier
  message?: string
  /** When false, renders inline wall content without overlay (for route gates). */
  modal?: boolean
}

const PRO_FEATURES = [
  'Unlimited media library',
  'MP3 / MP4 uploads & catalog management',
  'Theme organization & playback preview',
  'Create games from your library',
] as const

export function MediaLibraryUpgradeModal({
  open,
  onClose,
  tier = 'free',
  message,
  modal = true,
}: MediaLibraryUpgradeModalProps) {
  if (!open || tier === 'pro' || tier === 'enterprise') return null

  const defaultMessage =
    'Media Library requires Pro+. Upgrade to upload, manage, and play tracks from your catalog.'

  const body = (
    <>
      <div className={`flex items-start justify-between gap-3 ${modal ? 'px-5 pt-5 pb-3 border-b border-white/5 bg-[#121212]' : ''}`}>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#00FF66]/70 mb-1">
            Media Library requires Pro+
          </p>
          <h2 id="media-library-upgrade-title" className="text-lg font-bold text-white">
            Upgrade to Pro
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
        <div className="rounded-xl border border-[#00FF66]/35 bg-[#00FF66]/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Music2 className="w-4 h-4 text-[#00FF66]" />
            <span className="font-bold text-white">Free</span>
            <span className="text-[10px] uppercase tracking-wide text-white/50 font-semibold ml-auto">
              Current plan
            </span>
          </div>
          <ul className="text-xs text-white/45 space-y-1">
            <li>• Host & join games (unlimited players)</li>
            <li>• YouTube playlist games</li>
            <li>• Media library not included</li>
          </ul>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#121212] p-4 hover:border-[#00FF66]/30 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#00FF66]" />
            <span className="font-bold text-white">Pro</span>
            <span className="text-[10px] uppercase tracking-wide text-[#00FF66]/80 font-semibold ml-auto">
              Full media library
            </span>
          </div>
          <ul className="text-xs text-white/45 space-y-1 mb-3">
            {PRO_FEATURES.map((f) => (
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
            View Pro packages
          </Link>
        </div>
      </div>

      {modal ? (
        <div className="px-5 pb-5">
          <Link
            href="/host"
            className="block w-full text-center text-sm text-white/40 hover:text-white/60 py-2 transition-colors"
            onClick={onClose}
          >
            Back to host dashboard
          </Link>
        </div>
      ) : null}
    </>
  )

  if (!modal) {
    return (
      <div
        className="w-full max-w-lg rounded-2xl border border-[#00FF66]/25 bg-[#1E1E1E] shadow-[0_0_48px_rgba(0,255,102,0.12)] overflow-hidden"
        role="region"
        aria-labelledby="media-library-upgrade-title"
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
      aria-labelledby="media-library-upgrade-title"
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

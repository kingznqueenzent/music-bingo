'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { LyricGridLogo } from '@/components/LyricGridLogo'

type ErrorPageProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('[LyricGrid] Route error:', error.message, error.digest ?? '', error)
  }, [error])

  return (
    <main className="min-h-[calc(100dvh-3rem)] bg-[#121212] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg text-center">
        <div className="rounded-2xl border border-[#00FF66]/20 bg-[#1E1E1E] p-8 shadow-[0_0_48px_rgba(0,255,102,0.08)]">
          <div className="flex flex-col items-center mb-6">
            <LyricGridLogo size={48} className="mb-4 text-[#00FF66]" />
            <p className="text-xs uppercase tracking-[0.25em] text-[#FFD700]/80 mb-2">Something went wrong</p>
            <h1 className="text-2xl font-black text-[#00FF66]">Temporary error</h1>
          </div>

          <p className="text-slate-400 text-sm mb-4">
            A page or API request failed. This is often a timeout or brief network issue — try again without
            leaving the app.
          </p>

          {error.message ? (
            <p
              className="rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-red-300/90 text-xs font-mono mb-6 break-words"
              role="alert"
            >
              {error.message}
            </p>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-full bg-gradient-to-r from-[#00FF66] to-green-400 hover:from-green-300 hover:to-[#00FF66] text-[#121212] font-bold px-6 py-3 transition-all shadow-lg shadow-[#00FF66]/20"
            >
              Try again
            </button>
            <Link
              href="/lyricgrid"
              className="rounded-full border border-[#00FF66]/30 text-[#00FF66] font-semibold px-6 py-3 hover:bg-[#00FF66]/10 transition-colors"
            >
              Go home
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

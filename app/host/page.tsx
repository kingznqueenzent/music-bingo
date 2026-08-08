import Link from 'next/link'
import { HostCreateForm } from './HostCreateForm'
import { HostMonetizationTeasers } from '@/components/HostMonetizationTeasers'
import { HostTournamentsNavLink } from '@/components/HostTournamentsNavLink'
import { requireAdminSession } from '@/lib/admin-guard-server'
import { HostCommandCenter } from '@/components/host/HostCommandCenter'
import { HostGamesList } from '@/components/host/HostGamesList'
import { HostThemeLoadPanel } from '@/components/host/HostThemeLoadPanel'

export const dynamic = 'force-dynamic'

export default async function HostPage() {
  await requireAdminSession('/host')

  return (
    <main className="min-h-[calc(100dvh-3rem)] lg-surface-canvas flex flex-col items-center p-8">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-2 text-[var(--lg-neon)]">
        Host Control Panel
      </h1>
      <p className="text-white/45 text-sm mb-8">Create games, verify claims, and manage your room.</p>

      <HostCommandCenter />

      <HostGamesList />

      <div className="flex flex-wrap justify-center gap-4 mb-8 max-w-2xl">
        <HostTournamentsNavLink />
        <a
          href="/host/create-from-media"
          className="rounded-2xl border border-white/10 lg-surface-card px-8 py-4 text-lg font-semibold text-white/90 hover:border-[var(--lg-neon)]/40 transition-colors"
        >
          📁 Create from song catalog
        </a>
        <a
          href="/host/import-youtube"
          className="rounded-2xl border border-white/10 lg-surface-card px-8 py-4 text-lg font-semibold text-white/90 hover:border-[var(--lg-neon)]/40 transition-colors"
        >
          📺 Import YouTube songs (playlist or URLs)
        </a>
      </div>

      <div className="lg-surface-card rounded-2xl p-8 max-w-2xl w-full mb-8">
        <HostThemeLoadPanel />
      </div>

      <HostMonetizationTeasers />

      <div className="lg-surface-card rounded-2xl p-8 md:p-12 max-w-2xl w-full">
        <h2 className="text-2xl font-bold mb-2 text-white">New Game</h2>
        <p className="text-white/45 mb-8">
          Paste one YouTube link per line (min 45 for 5×5, 32 for 4×4). Each link is one square on the bingo cards.
        </p>
        <HostCreateForm />
      </div>

      <Link href="/lyricgrid" className="mt-12 text-white/45 hover:text-white text-lg transition-colors">
        ← Back to Home
      </Link>
    </main>
  )
}

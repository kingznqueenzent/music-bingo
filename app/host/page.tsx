import Link from 'next/link'
import { HostCreateForm } from './HostCreateForm'
import { HostMonetizationTeasers } from '@/components/HostMonetizationTeasers'
import { HostTournamentsNavLink } from '@/components/HostTournamentsNavLink'
import { requireAdminSession } from '@/lib/admin-guard-server'
import { HostCommandCenter } from '@/components/host/HostCommandCenter'
import { HostPageShell } from '@/components/host/HostPageShell'
import { HostGamesList } from '@/components/host/HostGamesList'
import { HostThemeLoadPanel } from '@/components/host/HostThemeLoadPanel'
import { HostLandingGuard } from './HostLandingGuard'

export const dynamic = 'force-dynamic'

export default async function HostPage() {
  await requireAdminSession('/host')

  return (
    <HostPageShell>
    <HostLandingGuard />
    <main className="min-h-[calc(100dvh-3rem)] lg-surface-canvas flex flex-col items-center p-8">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-2 text-[var(--lg-neon)]">
        Host Control Panel
      </h1>
      <p className="text-white/45 text-sm mb-6 text-center max-w-xl">
        Clean start every visit — stale games do not auto-resume. Start a new session or open a live
        console only when you intend to host.
      </p>

      <div className="flex flex-wrap justify-center gap-3 mb-8 max-w-2xl w-full">
        <a
          href="#start-new-game"
          className="rounded-full lg-neon-btn px-8 py-4 text-lg font-bold shadow-[0_0_24px_rgba(0,255,102,0.25)] touch-manipulation"
        >
          Start New Game
        </a>
        <a
          href="/host/create-from-media"
          className="rounded-full border border-[#00FF66]/40 text-[#00FF66] hover:bg-[#00FF66]/10 px-6 py-4 text-base font-semibold transition-colors touch-manipulation"
        >
          Create from catalog
        </a>
      </div>

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

      <div id="start-new-game" className="lg-surface-card rounded-2xl p-8 md:p-12 max-w-2xl w-full scroll-mt-8">
        <h2 className="text-2xl font-bold mb-2 text-white">Start New Game</h2>
        <p className="text-white/45 mb-8">
          Paste one YouTube link per line (min 45 for 5×5, 32 for 4×4). Each link is one square on the bingo cards.
        </p>
        <HostCreateForm />
      </div>

      <Link href="/lyricgrid" className="mt-12 text-white/45 hover:text-white text-lg transition-colors">
        ← Back to Home
      </Link>
    </main>
    </HostPageShell>
  )
}

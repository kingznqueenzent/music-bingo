import Link from 'next/link'
import { HostCreateForm } from './HostCreateForm'
import { HostMonetizationTeasers } from '@/components/HostMonetizationTeasers'
import { HostTournamentsNavLink } from '@/components/HostTournamentsNavLink'
import { requireAdminSession } from '@/lib/admin-guard-server'
import { HostCommandCenter } from '@/components/host/HostCommandCenter'
import { HostThemeLoadPanel } from '@/components/host/HostThemeLoadPanel'

export const dynamic = 'force-dynamic'

export default async function HostPage() {
  await requireAdminSession('/host')

  return (
    <main className="min-h-[calc(100dvh-3rem)] bg-[#121212] flex flex-col items-center p-8 text-white">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-2 text-[#00FFFF]">
        Host Control Panel
      </h1>
      <p className="text-slate-400 text-sm mb-8">Create games, verify claims, and manage your room.</p>

      <HostCommandCenter />

      <div className="flex flex-wrap justify-center gap-4 mb-8 max-w-2xl">
        <HostTournamentsNavLink />
        <a
          href="/host/create-from-media"
          className="rounded-2xl border border-slate-700 bg-slate-900/70 px-8 py-4 text-lg font-semibold text-slate-100 hover:border-emerald-500/50 hover:bg-slate-800/70 transition-colors"
        >
          📁 Create from song catalog
        </a>
        <a
          href="/host/import-youtube"
          className="rounded-2xl border border-slate-700 bg-slate-900/70 px-8 py-4 text-lg font-semibold text-slate-100 hover:border-emerald-500/50 hover:bg-slate-800/70 transition-colors"
        >
          📺 Import YouTube songs (playlist or URLs)
        </a>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-md shadow-black/40 p-8 max-w-2xl w-full mb-8">
        <HostThemeLoadPanel />
      </div>

      <HostMonetizationTeasers />

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-md shadow-black/40 p-12 max-w-2xl w-full">
        <h2 className="text-2xl font-bold mb-6 text-slate-50">Create with YouTube links</h2>
        <p className="text-slate-300 mb-8">
          Paste one YouTube link per line (min 45 for 5×5, 32 for 4×4). Each link is one square on the bingo cards.
        </p>
        <HostCreateForm />
      </div>

      <Link href="/lyricgrid" className="mt-12 text-slate-300 hover:text-white text-lg transition-colors">
        ← Back to Home
      </Link>
    </main>
  )
}

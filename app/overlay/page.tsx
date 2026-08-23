import Link from 'next/link'
import { Leaderboard } from '@/components/Leaderboard'

export const dynamic = 'force-dynamic'

/** Global overlay fallback — prefer per-game `/overlay/[gameId]` for stream setups. */
export default function OverlayPage() {
  return (
    <main
      className="min-h-0 w-full p-4 md:p-6 bg-transparent pointer-events-none"
      style={{ background: 'transparent' }}
    >
      <div
        className="pointer-events-auto max-w-2xl mx-auto bg-transparent space-y-4"
        style={{ background: 'transparent' }}
      >
        <p className="text-center text-sm text-[#00FF66]/80 rounded-xl border border-[#00FF66]/30 bg-black/40 px-4 py-3">
          For live games, open{' '}
          <code className="text-[#00FF66]">/overlay/[gameId]</code> from Host Dashboard →{' '}
          <strong>Meld Overlay</strong>.
        </p>
        <Leaderboard variant="overlay" limit={15} live title="LyricGrid" />
        <p className="text-center text-xs text-slate-500 pointer-events-auto">
          <Link href="/host" className="text-[#00FF66]/70 hover:text-[#00FF66] underline">
            Host dashboard
          </Link>
        </p>
      </div>
    </main>
  )
}

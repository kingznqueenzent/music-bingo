import Link from 'next/link'
import { HostArcadeScoreboardClient } from './HostArcadeScoreboardClient'

export default async function HostScoreboardPage({
  params,
}: {
  params: Promise<{ gameId: string }>
}) {
  const { gameId } = await params

  return (
    <main className="min-h-dvh w-full bg-[#050806] text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <Link
            href={`/host/${gameId}`}
            className="text-sm text-white/50 hover:text-[#00FF66] min-h-11 inline-flex items-center"
          >
            ← Back to host
          </Link>
          <Link
            href={`/stage/${gameId}`}
            className="text-sm text-[#00FF66]/80 hover:text-[#00FF66] min-h-11 inline-flex items-center"
          >
            Stage view →
          </Link>
        </div>
        <HostArcadeScoreboardClient gameId={gameId} />
      </div>
    </main>
  )
}

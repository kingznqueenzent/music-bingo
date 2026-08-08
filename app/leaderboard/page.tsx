import Link from 'next/link'
import { Leaderboard } from '@/components/Leaderboard'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function LeaderboardPage() {
  return (
    <main className="min-h-dvh bg-slate-950 text-white flex flex-col items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl md:text-6xl font-black text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">
          LYRICGRID
        </h1>
        <p className="text-slate-400 text-center text-lg md:text-xl mb-8">
          Global player rankings — wins and lifetime score
        </p>

        <Leaderboard limit={25} variant="page" live />

        <div className="mt-8 text-center">
          <Link href="/lyricgrid" className="text-slate-400 hover:text-white text-lg transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  )
}

import Link from 'next/link'
import { HostDashboard } from './HostDashboard'

export default async function HostGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center p-8 text-white">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-8 text-slate-100">
        <span className="block">🖥️ Host Control Panel</span>
      </h1>
      <HostDashboard gameId={gameId} />
      <Link href="/" className="mt-12 text-slate-300 hover:text-white text-lg transition-colors">
        ← Back to Home
      </Link>
    </main>
  )
}

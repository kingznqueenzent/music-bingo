import Link from 'next/link'
import { HostFeatureFlagsClient } from './HostFeatureFlagsClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function HostFeatureFlagsPage() {
  return (
    <main className="min-h-dvh bg-slate-950 text-white p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <Link href="/host" className="text-slate-400 hover:text-white text-sm">
          ← Host
        </Link>
        <h1 className="text-3xl font-black mt-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-emerald-400">
          Feature flags
        </h1>
        <p className="text-slate-400 mt-2 mb-8">
          Control B2B, monetization, tournaments, and XP features for LyricGrid.
        </p>
        <HostFeatureFlagsClient />
      </div>
    </main>
  )
}

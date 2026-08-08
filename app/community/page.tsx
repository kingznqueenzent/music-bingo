import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { CommunityHubClient } from './CommunityHubClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CommunityHubPage() {
  const supabase = createClient()
  if (!(await isFeatureEnabled(supabase, 'community_chat'))) {
    notFound()
  }

  return (
    <main className="min-h-dvh bg-slate-950 text-white flex flex-col items-center p-6 md:p-12">
      <div className="w-full max-w-3xl">
        <h1 className="text-4xl font-black text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-violet-300">
          Community Hub
        </h1>
        <p className="text-slate-400 text-center mb-10">
          Always-on rooms for LyricGrid players — hang out between games.
        </p>
        <CommunityHubClient />
        <p className="mt-12 text-center">
          <Link href="/lyricgrid" className="text-slate-400 hover:text-white">
            ← Home
          </Link>
        </p>
      </div>
    </main>
  )
}

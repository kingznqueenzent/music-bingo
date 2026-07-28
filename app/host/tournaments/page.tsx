import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isFeatureEnabled } from '@/lib/feature-flags'
import type { Theme } from '@/lib/supabase/types'
import type { Tournament } from '@/lib/supabase/types'
import { HostTournamentAdmin } from './HostTournamentAdmin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function HostTournamentsPage() {
  const supabase = createClient()
  if (!(await isFeatureEnabled(supabase, 'tournaments'))) {
    notFound()
  }
  const { data: themes } = await supabase.from('themes').select('id, name').order('name').limit(300)
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*')
    .order('start_date', { ascending: false })
    .limit(50)

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/host" className="text-slate-400 hover:text-white text-sm">
            ← Host
          </Link>
          <h1 className="text-3xl font-black mt-4 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200">
            Seasonal tournaments
          </h1>
          <p className="text-slate-400 mt-2">
            Create a series window, eligible themes, and share the public leaderboard link with players.
          </p>
        </div>
        <HostTournamentAdmin themes={(themes ?? []) as Pick<Theme, 'id' | 'name'>[]} initialTournaments={(tournaments ?? []) as Tournament[]} />
      </div>
    </main>
  )
}

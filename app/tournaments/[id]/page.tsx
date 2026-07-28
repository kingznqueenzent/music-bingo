import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isFeatureEnabled } from '@/lib/feature-flags'
import type { Tournament, TournamentEntry } from '@/lib/supabase/types'
import { TournamentLeaderboardClient } from '../TournamentLeaderboardClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = { params: Promise<{ id: string }> }

export default async function TournamentDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = createClient()
  if (!(await isFeatureEnabled(supabase, 'tournaments'))) {
    notFound()
  }

  const { data: tournament, error } = await supabase.from('tournaments').select('*').eq('id', id).single()

  if (error || !tournament) {
    notFound()
  }

  const chatEnabled = await isFeatureEnabled(supabase, 'community_chat')

  const { data: entries } = await supabase
    .from('tournament_entries')
    .select('*')
    .eq('tournament_id', id)
    .order('points', { ascending: false })

  const t = tournament as Tournament
  const list = (entries ?? []) as TournamentEntry[]

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-6 md:p-12">
      <div className="w-full max-w-3xl">
        <TournamentLeaderboardClient tournament={t} initialEntries={list} chatEnabled={chatEnabled} />
        <div className="mt-12 flex gap-6 text-slate-400">
          <Link href="/tournaments" className="hover:text-white">
            All tournaments
          </Link>
          <Link href="/leaderboard" className="hover:text-white">
            Global leaderboard
          </Link>
        </div>
      </div>
    </main>
  )
}

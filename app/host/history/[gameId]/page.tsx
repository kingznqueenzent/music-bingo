import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireAdminSession } from '@/lib/admin-guard-server'
import { createClient } from '@/lib/supabase/server'
import { HostPageShell } from '@/components/host/HostPageShell'
import { HostGameHistoryReview } from './HostGameHistoryReview'
import { roomCodeFromGame } from '@/types/database-extras'
import type { Game, PlaylistSong, PlayedSong } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

/**
 * Read-only historical review for score / winner disputes.
 * No live controls — cannot resume calling tracks from this route.
 */
export default async function HostGameHistoryPage({
  params,
}: {
  params: Promise<{ gameId: string }>
}) {
  await requireAdminSession('/host')
  const { gameId } = await params
  const supabase = createClient()

  const { data: game, error } = await supabase.from('games').select('*').eq('id', gameId).maybeSingle()

  if (error) {
    return (
      <HostPageShell>
        <main className="min-h-[calc(100dvh-3rem)] lg-surface-canvas flex flex-col items-center p-8">
          <p className="text-amber-300 text-sm">{error.message}</p>
          <Link href="/host" className="mt-6 text-[var(--lg-neon)] hover:underline">
            ← Back to host panel
          </Link>
        </main>
      </HostPageShell>
    )
  }

  if (!game) notFound()

  const status = String((game as Game).status ?? '')
  // Live / lobby sessions belong on the control console, not history.
  if (status === 'lobby' || status === 'playing') {
    const code = roomCodeFromGame(game as Game)
    redirect(`/host/${gameId}?code=${encodeURIComponent(code)}`)
  }

  let songs: PlaylistSong[] = []
  if ((game as Game).playlist_id) {
    const { data: s } = await supabase
      .from('playlist_songs')
      .select('*')
      .eq('playlist_id', (game as Game).playlist_id)
      .order('position')
    songs = (s ?? []) as PlaylistSong[]
  }

  const { count: playerCount } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', gameId)

  const { data: played } = await supabase
    .from('played_songs')
    .select('*')
    .eq('game_id', gameId)
    .order('played_at')

  const { data: history } = await supabase
    .from('game_history')
    .select('winner_names, total_players, duration_seconds, ended_at, started_at')
    .eq('game_id', gameId)
    .maybeSingle()

  const { data: cards } = await supabase
    .from('cards')
    .select('id, player_name, player_identifier, won')
    .eq('game_id', gameId)
    .order('player_name', { ascending: true })

  return (
    <HostPageShell>
      <main className="min-h-[calc(100dvh-3rem)] lg-surface-canvas flex flex-col items-center p-4 sm:p-8">
        <HostGameHistoryReview
          game={game as Game}
          songs={songs}
          played={(played ?? []) as PlayedSong[]}
          playerCount={playerCount ?? 0}
          history={
            history
              ? {
                  winner_names: (history.winner_names as string[]) ?? [],
                  total_players: Number(history.total_players ?? playerCount ?? 0),
                  duration_seconds:
                    history.duration_seconds != null ? Number(history.duration_seconds) : null,
                  ended_at: String(history.ended_at ?? ''),
                  started_at: history.started_at ? String(history.started_at) : null,
                }
              : null
          }
          players={(cards ?? []).map((c) => ({
            id: String(c.id),
            playerName: String(c.player_name ?? 'Player'),
            playerIdentifier: c.player_identifier ? String(c.player_identifier) : null,
            won: Boolean(c.won),
          }))}
        />
        <Link href="/host" className="mt-10 text-white/45 hover:text-white text-lg transition-colors">
          ← Back to Host Control Panel
        </Link>
      </main>
    </HostPageShell>
  )
}

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { HostDashboard } from './HostDashboard'
import type { Game, PlaylistSong, PlayedSong } from '@/lib/supabase/types'

export default async function HostGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params
  let initialGame: Game | null = null
  let initialSongs: PlaylistSong[] = []
  let initialPlayed: PlayedSong[] = []
  let initialPlayerCount = 0
  let serverError = ''

  try {
    const supabase = createClient()
    const { data: g, error: gameError } = await supabase.from('games').select('*').eq('id', gameId).single()
    if (gameError) {
      serverError = [gameError.message, gameError.details, gameError.hint].filter(Boolean).join(' ') || 'Could not load game.'
    } else if (g) {
      initialGame = g as Game
      if (g.playlist_id) {
        const { data: s } = await supabase.from('playlist_songs').select('*').eq('playlist_id', g.playlist_id).order('position')
        initialSongs = (s ?? []) as PlaylistSong[]
      }
      const { count } = await supabase.from('cards').select('*', { count: 'exact', head: true }).eq('game_id', gameId)
      initialPlayerCount = count ?? 0
      const { data: p } = await supabase.from('played_songs').select('*').eq('game_id', gameId).order('played_at')
      initialPlayed = (p ?? []) as PlayedSong[]
    }
  } catch (e) {
    serverError = e instanceof Error ? e.message : 'Could not load game.'
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center p-8 text-white">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-8 text-slate-100">
        <span className="block">🖥️ Host Control Panel</span>
      </h1>
      <HostDashboard
        gameId={gameId}
        initialGame={initialGame}
        initialSongs={initialSongs}
        initialPlayed={initialPlayed}
        initialPlayerCount={initialPlayerCount}
        serverError={serverError || undefined}
      />
      <Link href="/" className="mt-12 text-slate-300 hover:text-white text-lg transition-colors">
        ← Back to Home
      </Link>
    </main>
  )
}

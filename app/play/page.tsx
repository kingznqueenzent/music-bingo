import { createClient } from '@/lib/supabase/server'
import { PlayerCard } from './PlayerCard'

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{ cardId?: string; gameId?: string }>
}) {
  const params = await searchParams
  const cardId = params.cardId ?? ''
  const gameId = params.gameId ?? ''

  if (!cardId || !gameId) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-8 text-white">
        <p className="text-xl">Missing card or game. Join a game first.</p>
        <a href="/join" className="mt-6 text-xl underline text-emerald-400 hover:text-emerald-300">
          Join game
        </a>
      </main>
    )
  }

  let logoUrl: string | null = null
  try {
    const supabase = createClient()
    const { data } = await supabase.from('games').select('logo_url').eq('id', gameId).single()
    logoUrl = data?.logo_url ?? null
  } catch {
    // ignore
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center p-8 text-white">
      <PlayerCard cardId={cardId} gameId={gameId} logoUrl={logoUrl} />
    </main>
  )
}

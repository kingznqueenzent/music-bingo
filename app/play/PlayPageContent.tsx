import { createClient } from '@/lib/supabase/server'
import { getFeatureFlagMap } from '@/lib/feature-flags'
import { PlayView } from './PlayView'
import type { GameSponsor } from '@/lib/supabase/types'

type PlayPageContentProps = {
  gameId: string
  cardId: string
  lyricHint?: string | null
}

export async function PlayPageContent({ gameId, cardId, lyricHint = null }: PlayPageContentProps) {
  if (!cardId || !gameId) {
    return (
      <main className="min-h-dvh bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-8 text-white">
        <p className="text-xl">Missing card or game. Join a game first.</p>
        <a href="/join" className="mt-6 text-xl underline text-emerald-400 hover:text-emerald-300">
          Join game
        </a>
      </main>
    )
  }

  const supabase = createClient()
  const flags = await getFeatureFlagMap(supabase)
  const wl = flags.b2b_white_label
  const sponsorOn = flags.sponsor_integration

  let logoUrl: string | null = null
  let venueDisplayName: string | null = null
  let brandPrimaryHex: string | null = null
  let brandAccentHex: string | null = null
  let brandHideLyricgrid = false
  let sponsors: GameSponsor[] = []

  try {
    const { data: game } = await supabase.from('games').select('*').eq('id', gameId).single()
    if (game && wl) {
      logoUrl = game.logo_url ?? null
      venueDisplayName = game.venue_display_name ?? null
      brandPrimaryHex = game.brand_primary_hex ?? null
      brandAccentHex = game.brand_accent_hex ?? null
      brandHideLyricgrid = !!game.brand_hide_lyricgrid
    } else if (game) {
      logoUrl = game.logo_url ?? null
    }
    if (sponsorOn) {
      const { data: sp } = await supabase
        .from('game_sponsors')
        .select('*')
        .eq('game_id', gameId)
        .order('sort_order')
      sponsors = (sp ?? []) as GameSponsor[]
    }
  } catch {
    // ignore
  }

  return (
    <main className="h-dvh min-h-dvh bg-gradient-to-b from-[#121212] via-[#1E1E1E] to-[#121212] flex flex-col items-center p-3 sm:p-6 md:p-8 text-white overflow-x-hidden overflow-y-auto overscroll-contain">
      <PlayView
        cardId={cardId}
        gameId={gameId}
        logoUrl={logoUrl}
        lyricHint={lyricHint}
        whiteLabel={
          wl
            ? {
                venueDisplayName,
                brandPrimaryHex,
                brandAccentHex,
                brandHideLyricgrid,
              }
            : null
        }
        sponsors={sponsorOn ? sponsors : []}
      />
    </main>
  )
}

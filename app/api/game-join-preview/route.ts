import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { roomCodeLookupFilter } from '@/lib/game-room-code'
import { roomCodeFromGame } from '@/types/database-extras'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')?.trim().toUpperCase() ?? ''
  if (!code) {
    return NextResponse.json({ ok: false, error: 'Missing code' }, { status: 400 })
  }

  const supabase = createClient()
  const { data: game, error } = await supabase
    .from('games')
    .select(
      'id, code, room_code, status, venue_display_name, logo_url, brand_primary_hex, brand_accent_hex, brand_hide_lyricgrid, entry_fee_cents'
    )
    .or(roomCodeLookupFilter(code))
    .maybeSingle()

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  if (!game) {
    return NextResponse.json({ ok: false, error: 'Game not found' }, { status: 404 })
  }

  const [whiteLabel, paidEntry] = await Promise.all([
    isFeatureEnabled(supabase, 'b2b_white_label'),
    isFeatureEnabled(supabase, 'paid_entry_games'),
  ])

  return NextResponse.json({
    ok: true,
    game: {
      id: game.id,
      code: roomCodeFromGame(game),
      status: game.status,
      venueDisplayName: whiteLabel ? game.venue_display_name : null,
      logoUrl: whiteLabel ? game.logo_url : null,
      brandPrimaryHex: whiteLabel ? game.brand_primary_hex : null,
      brandAccentHex: whiteLabel ? game.brand_accent_hex : null,
      brandHideLyricgrid: whiteLabel ? !!game.brand_hide_lyricgrid : false,
      entryFeeCents: paidEntry ? game.entry_fee_cents ?? 0 : 0,
    },
  })
}

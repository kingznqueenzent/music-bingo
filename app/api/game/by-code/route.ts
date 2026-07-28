import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGameByCode } from '@/lib/game-session'

/** Base44 getGameByCode — GET /api/game/by-code?code=XXXX */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code') ?? ''
  const supabase = createClient()
  const { game, error } = await getGameByCode(supabase, code)

  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 500 })
  }
  if (!game) {
    return NextResponse.json({ ok: false, error: 'Game not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, game })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Host: set game status to playing. Called by host dashboard "Start game" button. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { gameId } = body as { gameId?: string }
    if (!gameId) {
      return NextResponse.json({ ok: false, error: 'Missing gameId' }, { status: 400 })
    }

    const supabase = createClient()
    const { error } = await supabase.from('games').update({ status: 'playing' }).eq('id', gameId)
    if (error) {
      const msg = [error.message, error.details, error.hint].filter(Boolean).join(' ')
      return NextResponse.json({ ok: false, error: msg || error.message }, { status: 200 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

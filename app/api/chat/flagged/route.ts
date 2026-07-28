import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { isFeatureEnabled } from '@/lib/feature-flags'

const ADMIN_COOKIE = 'admin_verified'

/** Host / admin: list flagged messages for a game (moderation inbox). */
export async function GET(req: NextRequest) {
  const jar = await cookies()
  if (jar.get(ADMIN_COOKIE)?.value !== '1') {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 })
  }

  const supabase = createClient()
  if (!(await isFeatureEnabled(supabase, 'community_chat'))) {
    return NextResponse.json({ ok: false, error: 'Chat disabled' }, { status: 404 })
  }

  const gameId = new URL(req.url).searchParams.get('gameId')
  if (!gameId) return NextResponse.json({ ok: false, error: 'gameId required' }, { status: 400 })

  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, player_name, message, room, created_at, is_flagged')
    .eq('game_id', gameId)
    .eq('is_flagged', true)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, messages: data ?? [] })
}

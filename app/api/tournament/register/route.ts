import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isFeatureEnabled } from '@/lib/feature-flags'

const VETERAN_BADGE = 'tournament_veteran'

function mergeBadges(existing: string[] | null | undefined, add: string[]): string[] {
  return [...new Set([...(existing ?? []), ...add])]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tournamentId, playerEmail, playerName, playerIdentifier } = body as {
      tournamentId?: string
      playerEmail?: string
      playerName?: string
      playerIdentifier?: string
    }

    const email = playerEmail?.trim().toLowerCase()
    const name = playerName?.trim()
    const pid = playerIdentifier?.trim()

    if (!tournamentId || !email || !name || !pid) {
      return NextResponse.json(
        { ok: false, error: 'Missing tournamentId, playerEmail, playerName, or playerIdentifier' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    if (!(await isFeatureEnabled(supabase, 'tournaments'))) {
      return NextResponse.json({ ok: false, error: 'Tournaments are disabled' }, { status: 403 })
    }

    const { data: t } = await supabase
      .from('tournaments')
      .select('id, status, max_players, end_date')
      .eq('id', tournamentId)
      .single()

    if (!t) {
      return NextResponse.json({ ok: false, error: 'Tournament not found' }, { status: 404 })
    }

    const today = new Date().toISOString().slice(0, 10)
    if (t.end_date < today) {
      return NextResponse.json({ ok: false, error: 'This tournament has ended' }, { status: 400 })
    }
    if (t.status === 'completed') {
      return NextResponse.json({ ok: false, error: 'Tournament is already completed' }, { status: 400 })
    }

    if (t.max_players != null) {
      const { count } = await supabase
        .from('tournament_entries')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId)
      if (count != null && count >= t.max_players) {
        return NextResponse.json({ ok: false, error: 'Tournament is full' }, { status: 400 })
      }
    }

    const { error: insertErr } = await supabase.from('tournament_entries').insert({
      tournament_id: tournamentId,
      player_email: email,
      player_name: name,
      player_identifier: pid,
    })

    if (insertErr) {
      if (/duplicate|unique/i.test(insertErr.message)) {
        return NextResponse.json({ ok: false, error: 'You are already registered for this tournament' }, { status: 400 })
      }
      return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 })
    }

    const { count: entryCount } = await supabase
      .from('tournament_entries')
      .select('id', { count: 'exact', head: true })
      .eq('player_identifier', pid)

    const n = entryCount ?? 0
    if (n >= 3) {
      const { data: lb } = await supabase.from('leaderboard').select('id, badges').eq('identifier', pid).maybeSingle()
      if (lb && !(lb.badges as string[] | null)?.includes(VETERAN_BADGE)) {
        await supabase
          .from('leaderboard')
          .update({
            badges: mergeBadges(lb.badges as string[] | null, [VETERAN_BADGE]),
            updated_at: new Date().toISOString(),
          })
          .eq('id', lb.id)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

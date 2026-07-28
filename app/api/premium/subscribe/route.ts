import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isFeatureEnabled } from '@/lib/feature-flags'

/** Demo: toggle Premium on a profile by identifier (no payment processor). */
export async function POST(req: Request) {
  const supabase = createClient()
  if (!(await isFeatureEnabled(supabase, 'premium_player_pass'))) {
    return NextResponse.json({ ok: false, error: 'Not available' }, { status: 404 })
  }

  let body: { identifier?: string; enable?: boolean }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const identifier = body.identifier?.trim() ?? ''
  if (!identifier) {
    return NextResponse.json({ ok: false, error: 'identifier required' }, { status: 400 })
  }

  const enable = body.enable !== false

  const { data: row } = await supabase.from('leaderboard').select('id, badges').eq('identifier', identifier).maybeSingle()
  if (!row) {
    return NextResponse.json({ ok: false, error: 'Profile not found. Play a game first.' }, { status: 404 })
  }

  const baseBadges = (row.badges ?? []) as string[]
  const badges = enable
    ? [...new Set([...baseBadges, 'premium_patron'])]
    : baseBadges.filter((b: string) => b !== 'premium_patron')

  const { error } = await supabase
    .from('leaderboard')
    .update({
      premium_subscriber: enable,
      badges,
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, premium: enable })
}

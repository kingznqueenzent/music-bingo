import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { isFeatureEnabled } from '@/lib/feature-flags'

const ADMIN_COOKIE = 'admin_verified'

export async function POST(request: NextRequest) {
  try {
    const jar = await cookies()
    if (jar.get(ADMIN_COOKIE)?.value !== '1') {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 })
    }

    const supabase = createClient()
    if (!(await isFeatureEnabled(supabase, 'tournaments'))) {
      return NextResponse.json({ ok: false, error: 'Tournaments are disabled' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      status,
      start_date,
      end_date,
      theme_ids,
      format,
      rounds_total,
      prize_description,
      banner_url,
      max_players,
      winner_bonus_xp,
    } = body as {
      name?: string
      status?: string
      start_date?: string
      end_date?: string
      theme_ids?: string[]
      format?: string
      rounds_total?: number
      prize_description?: string
      banner_url?: string
      max_players?: number | null
      winner_bonus_xp?: number
    }

    if (!name?.trim() || !start_date || !end_date) {
      return NextResponse.json({ ok: false, error: 'Missing name, start_date, or end_date' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('tournaments')
      .insert({
        name: name.trim(),
        status: status === 'active' || status === 'completed' || status === 'upcoming' ? status : 'upcoming',
        start_date,
        end_date,
        theme_ids: Array.isArray(theme_ids) ? theme_ids : [],
        format: format === 'bracket' ? 'bracket' : 'points',
        rounds_total: typeof rounds_total === 'number' && rounds_total >= 1 ? rounds_total : 1,
        prize_description: prize_description?.trim() ?? null,
        banner_url: banner_url?.trim() ?? null,
        max_players: max_players == null ? null : max_players,
        winner_bonus_xp: typeof winner_bonus_xp === 'number' ? winner_bonus_xp : 200,
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id: data?.id })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

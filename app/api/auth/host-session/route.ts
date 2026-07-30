import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getUserFromBearer } from '@/lib/supabase/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_COOKIE, isPlayerProfileAdmin } from '@/lib/admin-access'
import { syncPlayerProfileOnLogin } from '@/lib/player-profile-sync'

/** After Supabase sign-in, sync profile, verify admin, and set host access cookie. */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromBearer(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    const supabase = createClient()
    const sync = await syncPlayerProfileOnLogin(supabase, user)
    if (!sync.ok) {
      return NextResponse.json({ error: sync.error ?? 'Could not sync profile.' }, { status: 500 })
    }

    const { data: profile, error } = await supabase
      .from('player_profiles')
      .select('id, role, is_admin, email')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!isPlayerProfileAdmin(profile) && !sync.isAdmin) {
      return NextResponse.json(
        { error: 'This account does not have host access. Contact your venue administrator.' },
        { status: 403 }
      )
    }

    const response = NextResponse.json({ ok: true, redirect: '/host' })
    response.cookies.set(ADMIN_COOKIE, '1', {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
    })
    return response
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not establish session.' },
      { status: 500 }
    )
  }
}

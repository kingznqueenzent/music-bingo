import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { FeatureFlagKey } from '@/lib/feature-flag-keys'
import { FEATURE_FLAG_KEYS } from '@/lib/feature-flag-keys'

const ADMIN_COOKIE = 'admin_verified'

function isValidKey(k: string): k is FeatureFlagKey {
  return (FEATURE_FLAG_KEYS as readonly string[]).includes(k)
}

/** Admin-only: toggle a feature flag */
export async function PATCH(request: NextRequest) {
  const jar = await cookies()
  if (jar.get(ADMIN_COOKIE)?.value !== '1') {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const body = (await request.json()) as { key?: string; enabled?: boolean }
    const key = body.key?.trim()
    if (!key || !isValidKey(key)) {
      return NextResponse.json({ ok: false, error: 'Invalid key' }, { status: 400 })
    }
    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json({ ok: false, error: 'enabled must be boolean' }, { status: 400 })
    }

    const supabase = createClient()
    const { error } = await supabase.from('feature_flags').update({ enabled: body.enabled }).eq('key', key)

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

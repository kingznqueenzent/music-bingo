import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from('playlists').select('id').limit(1)
    if (error) {
      const code = (error as { code?: string }).code
      const hint =
        code === '42P01' || error.message.includes('does not exist')
          ? 'Run supabase/schema.sql in Supabase SQL Editor (Dashboard → SQL Editor → New query, paste schema, Run).'
          : code === 'PGRST301' || error.message.includes('JWT') || error.message.includes('API key')
            ? 'Use the anon / publishable key from Project Settings → API. If you use a custom key, ensure it’s the public (publishable) one.'
            : 'Check Supabase project is not paused and RLS policies allow read.'
      return NextResponse.json(
        { ok: false, error: error.message, code, hint },
        { status: 502 }
      )
    }
    return NextResponse.json({ ok: true, message: 'Supabase connected.', count: data?.length ?? 0 })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const isNetwork = message.toLowerCase().includes('fetch failed') || message.toLowerCase().includes('econnrefused')
    const hint = isNetwork
      ? 'Cannot reach Supabase. Check URL (https://xxx.supabase.co), project not paused, and no firewall blocking.'
      : 'Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.'
    return NextResponse.json({ ok: false, error: message, hint }, { status: 500 })
  }
}

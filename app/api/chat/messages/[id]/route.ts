import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { isFeatureEnabled } from '@/lib/feature-flags'

const ADMIN_COOKIE = 'admin_verified'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(_req: Request, { params }: Params) {
  const jar = await cookies()
  if (jar.get(ADMIN_COOKIE)?.value !== '1') {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 })

  const supabase = createClient()
  if (!(await isFeatureEnabled(supabase, 'community_chat'))) {
    return NextResponse.json({ ok: false, error: 'Chat disabled' }, { status: 404 })
  }

  const { error } = await supabase.from('chat_messages').update({ is_deleted: true }).eq('id', id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

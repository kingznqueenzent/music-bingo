import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SFX_BUCKET } from '@/lib/media/sfx-storage'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const body = (await request.json()) as { name?: string }
  const name = body.name?.trim()
  if (!name) {
    return NextResponse.json({ error: 'Missing name' }, { status: 400 })
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('sfx_assets')
    .update({ name })
    .eq('id', id)
    .select('id, game_id, name, file_path, file_url, file_type, file_size_bytes, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const supabase = createClient()

  const { data: row, error: fetchError } = await supabase
    .from('sfx_assets')
    .select('file_path, storage_bucket')
    .eq('id', id)
    .single()

  if (fetchError || !row) {
    return NextResponse.json({ error: fetchError?.message ?? 'Not found' }, { status: 404 })
  }

  const bucket = row.storage_bucket || SFX_BUCKET
  await supabase.storage.from(bucket).remove([row.file_path])

  const { error: deleteError } = await supabase.from('sfx_assets').delete().eq('id', id)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

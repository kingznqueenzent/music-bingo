import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SFX_BUCKET, validateSfxFile } from '@/lib/media/sfx-storage'

const MAX_SIZE = 10 * 1024 * 1024

export async function GET(request: NextRequest) {
  const gameId = request.nextUrl.searchParams.get('gameId')?.trim()
  if (!gameId) {
    return NextResponse.json({ error: 'Missing gameId' }, { status: 400 })
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('sfx_assets')
    .select('id, game_id, name, file_path, file_url, file_type, file_size_bytes, created_at')
    .eq('game_id', gameId)
    .order('created_at', { ascending: false })

  if (error) {
    if (/sfx_assets|schema cache|does not exist/i.test(error.message)) {
      return NextResponse.json({ assets: [], warning: 'sfx_assets table not migrated yet' })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ assets: data ?? [] })
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const gameId = (formData.get('gameId') as string)?.trim()
    const name = (formData.get('name') as string)?.trim() || file?.name || 'SFX'

    if (!file || !gameId) {
      return NextResponse.json({ error: 'Missing file or gameId' }, { status: 400 })
    }

    const validated = validateSfxFile(file)
    if ('error' in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })
    }

    const supabase = createClient()
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const path = `${gameId}/${validated.ext}/${safeName}`

    const buf = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage.from(SFX_BUCKET).upload(path, buf, {
      contentType: file.type || (validated.ext === 'mp3' ? 'audio/mpeg' : 'audio/wav'),
      upsert: false,
    })
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from(SFX_BUCKET).getPublicUrl(path)
    const fileUrl = urlData.publicUrl

    const { data: row, error: insertError } = await supabase
      .from('sfx_assets')
      .insert({
        game_id: gameId,
        name,
        file_path: path,
        file_url: fileUrl,
        storage_bucket: SFX_BUCKET,
        file_type: validated.ext,
        file_size_bytes: file.size,
      })
      .select('id, game_id, name, file_path, file_url, file_type, file_size_bytes, created_at')
      .single()

    if (insertError) {
      await supabase.storage.from(SFX_BUCKET).remove([path])
      if (/sfx_assets|schema cache|does not exist/i.test(insertError.message)) {
        return NextResponse.json(
          {
            error:
              'sfx_assets table missing — run supabase/migrations/20260815120000_sfx_assets.sql in Supabase SQL Editor.',
          },
          { status: 503 }
        )
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json(row)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

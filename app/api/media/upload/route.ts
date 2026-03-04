import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'media'
const MAX_SIZE = 100 * 1024 * 1024 // 100 MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    const name = (formData.get('name') as string)?.trim() || file.name
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'mp3' && ext !== 'mp4') {
      return NextResponse.json({ error: 'Only MP3 and MP4 files are allowed' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 100 MB)' }, { status: 400 })
    }

    const supabase = createClient()
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const path = `${ext}/${safeName}`

    const buf = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buf, {
      contentType: file.type,
      upsert: false,
    })
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
    const fileUrl = urlData.publicUrl

    const { data: row, error: insertError } = await supabase
      .from('media_library')
      .insert({
        name,
        file_path: path,
        file_url: fileUrl,
        storage_bucket: BUCKET,
        file_type: ext as 'mp3' | 'mp4',
        file_size_bytes: file.size,
      })
      .select('id, name, file_path, file_url, file_type, created_at')
      .single()

    if (insertError) {
      await supabase.storage.from(BUCKET).remove([path])
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      ...row,
      file_url: fileUrl,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

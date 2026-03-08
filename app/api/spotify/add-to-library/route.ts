import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id: spotify_track_id, name, album_art_url } = body as {
      id?: string
      name?: string
      album_art_url?: string | null
    }
    if (!spotify_track_id || !name?.trim()) {
      return NextResponse.json(
        { error: 'Missing id or name for the track' },
        { status: 400 }
      )
    }
    const supabase = createClient()
    const file_path = `spotify/${spotify_track_id}`
    const { data: row, error } = await supabase
      .from('media_library')
      .insert({
        name: name.trim(),
        file_path,
        file_url: null,
        storage_bucket: 'media',
        file_type: 'spotify',
        file_size_bytes: null,
        spotify_track_id,
        album_art_url: album_art_url ?? null,
      })
      .select('id, name, spotify_track_id, album_art_url, file_type, created_at')
      .single()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(row)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to add track' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function extractVideoId(line: string): string | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
  if (watchMatch) return watchMatch[1]
  const shortMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
  if (shortMatch) return shortMatch[1]
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed
  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { themeId, urlsText } = body as { themeId?: string; urlsText?: string }
    if (!themeId || typeof themeId !== 'string') {
      return NextResponse.json({ error: 'Missing themeId' }, { status: 400 })
    }
    const text = typeof urlsText === 'string' ? urlsText : ''
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    const ids = new Set<string>()
    for (const line of lines) {
      const id = extractVideoId(line)
      if (id) ids.add(id)
    }
    const videoIds = [...ids]
    if (videoIds.length < 1) {
      return NextResponse.json(
        { error: 'No valid YouTube URLs or video IDs found. Use links like https://www.youtube.com/watch?v=VIDEO_ID or one video ID per line.' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    const toInsert = videoIds.map((id, i) => ({
      theme_id: themeId,
      youtube_id: id,
      title: null,
      position: i,
    }))
    const { error: insertError } = await supabase.from('theme_songs').insert(toInsert)
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 502 })
    }
    return NextResponse.json({ ok: true, count: videoIds.length })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

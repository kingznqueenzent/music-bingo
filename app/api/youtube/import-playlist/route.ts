import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_VIDEOS = 60
const PAGE_SIZE = 50

function parsePlaylistId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const listMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/)
  if (listMatch) return listMatch[1]
  if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) return trimmed
  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { themeId, playlistIdOrUrl } = body as { themeId?: string; playlistIdOrUrl?: string }
    if (!themeId || typeof themeId !== 'string') {
      return NextResponse.json({ error: 'Missing themeId' }, { status: 400 })
    }
    const playlistId = parsePlaylistId(playlistIdOrUrl ?? '')
    if (!playlistId) {
      return NextResponse.json({ error: 'Invalid playlist URL or ID. Use a link like https://www.youtube.com/playlist?list=PLxxx or just the ID.' }, { status: 400 })
    }

    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'YouTube import is not configured. Set YOUTUBE_API_KEY in environment.' },
        { status: 503 }
      )
    }

    const videos: { youtube_id: string; title: string | null }[] = []
    let nextPageToken = ''

    while (videos.length < MAX_VIDEOS) {
      const params = new URLSearchParams({
        part: 'snippet',
        playlistId,
        maxResults: String(PAGE_SIZE),
        key: apiKey,
      })
      if (nextPageToken) params.set('pageToken', nextPageToken)
      const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`)
      if (!res.ok) {
        const text = await res.text()
        let message = `YouTube API error: ${res.status}. ${text.slice(0, 200)}`
        if (res.status === 401 || res.status === 403 || text.toLowerCase().includes('invalid') || text.toLowerCase().includes('api key')) {
          message = 'Invalid or restricted YouTube API key. In Google Cloud Console: enable YouTube Data API v3 for the project, use a valid API key, and avoid over‑restricting the key (e.g. try no HTTP referrer / IP restrictions first).'
        }
        return NextResponse.json({ error: message }, { status: 502 })
      }
      const data = await res.json()
      const items = data.items || []
      for (const item of items) {
        const vid = item.snippet?.resourceId?.videoId
        const title = item.snippet?.title ?? null
        if (vid) videos.push({ youtube_id: vid, title })
        if (videos.length >= MAX_VIDEOS) break
      }
      nextPageToken = data.nextPageToken || ''
      if (!nextPageToken) break
    }

    if (videos.length < 1) {
      return NextResponse.json({ error: 'No videos found in that playlist.' }, { status: 400 })
    }

    const supabase = createClient()
    const toInsert = videos.map((v, i) => ({
      theme_id: themeId,
      youtube_id: v.youtube_id,
      title: v.title,
      position: i,
    }))
    const { error: insertError } = await supabase.from('theme_songs').insert(toInsert)
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 502 })
    }
    return NextResponse.json({ ok: true, count: videos.length })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
const SPOTIFY_SEARCH_URL = 'https://api.spotify.com/v1/search'

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.access_token ?? null
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q) {
    return NextResponse.json({ error: 'Missing query parameter q' }, { status: 400 })
  }
  const token = await getAccessToken()
  if (!token) {
    return NextResponse.json(
      { error: 'Spotify is not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.' },
      { status: 503 }
    )
  }
  const params = new URLSearchParams({ q, type: 'track', limit: '20' })
  const res = await fetch(`${SPOTIFY_SEARCH_URL}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json(
      { error: `Spotify API error: ${res.status} ${text.slice(0, 200)}` },
      { status: 502 }
    )
  }
  const data = await res.json()
  const tracks = (data.tracks?.items ?? []).map((t: {
    id: string
    name: string
    artists?: { name: string }[]
    album?: { images?: { url: string }[] }
  }) => ({
    id: t.id,
    name: t.name,
    artist: t.artists?.map((a: { name: string }) => a.name).join(', ') ?? '',
    album_art_url: t.album?.images?.[0]?.url ?? null,
  }))
  return NextResponse.json({ tracks })
}

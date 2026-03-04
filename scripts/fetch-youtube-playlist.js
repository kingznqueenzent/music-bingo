#!/usr/bin/env node
/**
 * Fetch up to 60 video IDs from a YouTube playlist and output SQL INSERTs
 * for public.theme_songs. Uses YouTube Data API v3.
 *
 * Prerequisites:
 *   1. Create a project in Google Cloud Console.
 *   2. Enable "YouTube Data API v3".
 *   3. Create an API key (Credentials → Create credentials → API key).
 *
 * Usage:
 *   set YOUTUBE_API_KEY=your_key_here
 *   node scripts/fetch-youtube-playlist.js <theme_id> <playlist_id>
 *
 * Example:
 *   node scripts/fetch-youtube-playlist.js a1000000-0000-0000-0000-000000000001 PLrAXerErn2Tl2c3d2_2Fk_6F_EKdF
 *
 * Playlist ID: from a URL like https://www.youtube.com/playlist?list=PLrAXerErn2T...
 *              the id is the part after list=
 *
 * Output: copy the printed SQL and run it in Supabase SQL Editor.
 */

const THEME_ID = process.argv[2]
const PLAYLIST_ID = process.argv[3]
const API_KEY = process.env.YOUTUBE_API_KEY

const MAX_VIDEOS = 60
const PAGE_SIZE = 50

if (!THEME_ID || !PLAYLIST_ID) {
  console.error('Usage: node fetch-youtube-playlist.js <theme_id> <playlist_id>')
  console.error('Example: node fetch-youtube-playlist.js a1000000-0000-0000-0000-000000000001 PLrAXerErn2T...')
  process.exit(1)
}

if (!API_KEY) {
  console.error('Set YOUTUBE_API_KEY environment variable (Google Cloud Console → API key).')
  process.exit(1)
}

async function fetchPlaylistItems(pageToken = '') {
  const params = new URLSearchParams({
    part: 'snippet',
    playlistId: PLAYLIST_ID,
    maxResults: String(PAGE_SIZE),
    key: API_KEY,
  })
  if (pageToken) params.set('pageToken', pageToken)
  const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`)
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`YouTube API error ${res.status}: ${t}`)
  }
  return res.json()
}

function escapeSql(str) {
  if (str == null) return 'NULL'
  return "'" + String(str).replace(/'/g, "''") + "'"
}

async function main() {
  const videos = []
  let nextPageToken = ''

  while (videos.length < MAX_VIDEOS) {
    const data = await fetchPlaylistItems(nextPageToken)
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

  if (videos.length < 25) {
    console.error(`Only ${videos.length} videos found. Need at least 25 for bingo.`)
    process.exit(1)
  }

  console.log('-- Paste this into Supabase SQL Editor (theme_songs for theme ' + THEME_ID + ', ' + videos.length + ' songs)')
  console.log('INSERT INTO public.theme_songs (theme_id, youtube_id, title, position) VALUES')

  const values = videos.map((v, i) =>
    `  (${escapeSql(THEME_ID)}, ${escapeSql(v.youtube_id)}, ${escapeSql(v.title)}, ${i})`
  )
  console.log(values.join(',\n') + ';')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

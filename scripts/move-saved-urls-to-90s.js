#!/usr/bin/env node
/**
 * Move saved YouTube URLs from 2000s Hits to 90s Hits theme.
 * Usage: node scripts/move-saved-urls-to-90s.js
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const THEME_90S = 'a1000000-0000-0000-0000-000000000001'
const THEME_2000S = 'a1000000-0000-0000-0000-000000000002'

function getDatabaseUrl() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) return null
  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    if (line.startsWith('DATABASE_URL=')) {
      let val = line.slice('DATABASE_URL='.length).trim()
      while (val.startsWith('"')) val = val.slice(1)
      while (val.endsWith('"')) val = val.slice(0, -1)
      return val.replace(/\\\$/g, '$')
    }
  }
  return null
}

function extractVideoId(line) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return null
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
  if (watchMatch) return watchMatch[1]
  const shortMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
  if (shortMatch) return shortMatch[1]
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed
  return null
}

async function main() {
  const databaseUrl = getDatabaseUrl() || process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL not set in .env.local')
    process.exit(1)
  }

  const urlsPath = path.join(__dirname, 'saved-youtube-urls.txt')
  const content = fs.readFileSync(urlsPath, 'utf8')
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const videoIds = []
  const seen = new Set()
  for (const line of lines) {
    const id = extractVideoId(line)
    if (id && !seen.has(id)) {
      seen.add(id)
      videoIds.push(id)
    }
  }

  const client = new Client({ connectionString: databaseUrl })
  try {
    await client.connect()

    const maxPos = await client.query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM public.theme_songs WHERE theme_id = $1',
      [THEME_90S]
    )
    let position = Number(maxPos.rows[0]?.next_pos) || 0
    let added = 0
    for (const youtubeId of videoIds) {
      const exists = await client.query(
        'SELECT 1 FROM public.theme_songs WHERE theme_id = $1 AND youtube_id = $2 LIMIT 1',
        [THEME_90S, youtubeId]
      )
      if (exists.rows.length === 0) {
        await client.query(
          'INSERT INTO public.theme_songs (theme_id, youtube_id, title, position) VALUES ($1, $2, NULL, $3)',
          [THEME_90S, youtubeId, position]
        )
        added++
        position++
      }
    }

    const del = await client.query(
      'DELETE FROM public.theme_songs WHERE theme_id = $1 AND youtube_id = ANY($2::text[])',
      [THEME_2000S, videoIds]
    )

    console.log(`90s Hits: added ${added} songs (${videoIds.length} total in list).`)
    console.log(`2000s Hits: removed ${del.rowCount} songs (moved to 90s).`)
    console.log('Done. Your playlist is now under 90s Hits.')
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()

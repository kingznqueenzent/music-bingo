#!/usr/bin/env node
/**
 * Import saved YouTube URLs from scripts/saved-youtube-urls.txt into a theme.
 * Uses DATABASE_URL from .env.local. Theme: first theme in DB or 90s Hits seed ID.
 * Usage: node scripts/import-saved-youtube-urls.js
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

function getDatabaseUrl() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) return null
  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    if (line.startsWith('DATABASE_URL=')) {
      let val = line.slice('DATABASE_URL='.length).trim()
      while (val.startsWith('"')) val = val.slice(1)
      while (val.endsWith('"')) val = val.slice(0, -1)
      while (val.startsWith("'")) val = val.slice(1)
      while (val.endsWith("'")) val = val.slice(0, -1)
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
  if (!fs.existsSync(urlsPath)) {
    console.error('saved-youtube-urls.txt not found')
    process.exit(1)
  }
  const content = fs.readFileSync(urlsPath, 'utf8')
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const ids = new Set()
  for (const line of lines) {
    const id = extractVideoId(line)
    if (id) ids.add(id)
  }
  const videoIds = [...ids]
  if (videoIds.length === 0) {
    console.error('No valid YouTube video IDs found in saved-youtube-urls.txt')
    process.exit(1)
  }

  const client = new Client({ connectionString: databaseUrl })
  try {
    await client.connect()
    const themeResult = await client.query(
      "SELECT id, name FROM public.themes ORDER BY CASE WHEN name = '90s Hits' THEN 0 ELSE 1 END, name LIMIT 1"
    )
    const theme = themeResult.rows[0]
    if (!theme) {
      console.error('No themes in database. Run supabase/seed-themes.sql first.')
      process.exit(1)
    }
    const themeId = theme.id
    const themeName = theme.name

    const maxPosResult = await client.query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM public.theme_songs WHERE theme_id = $1',
      [themeId]
    )
    let position = Number(maxPosResult.rows[0]?.next_pos) || 0

    let added = 0
    for (const youtubeId of videoIds) {
      const exists = await client.query(
        'SELECT 1 FROM public.theme_songs WHERE theme_id = $1 AND youtube_id = $2 LIMIT 1',
        [themeId, youtubeId]
      )
      if (exists.rows.length === 0) {
        await client.query(
          `INSERT INTO public.theme_songs (theme_id, youtube_id, title, position) VALUES ($1, $2, NULL, $3)`,
          [themeId, youtubeId, position]
        )
        added++
        position++
      }
    }

    console.log(`Done. Added ${added} new songs to theme "${themeName}" (${themeId}). ${videoIds.length - added} were already in the theme.`)
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()

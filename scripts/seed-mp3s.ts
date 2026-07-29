#!/usr/bin/env node
/**
 * Bulk ingest MP3 + YouTube metadata into public.theme_songs.
 *
 * Usage:
 *   npm run db:seed-mp3s -- --file scripts/seed-mp3s.example.json
 *   npm run db:seed-mp3s -- --file tracks.json --dry-run
 *
 * JSON row shape:
 * {
 *   "title": "Track Title",
 *   "artist": "Optional Artist",
 *   "theme_tag": "90s Hits",
 *   "audio_filename": "folder/track.mp3",
 *   "audio_url": "optional full URL override",
 *   "youtube_id": "dQw4w9WgXcQ",
 *   "start_time": 42,
 *   "position": 0
 * }
 */
import fs from 'fs'
import path from 'path'
import { Client } from 'pg'
import dotenv from 'dotenv'
import { resolveAudioClipUrl } from '../lib/audio-clips'

dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true })

export type Mp3TrackInput = {
  title: string
  artist?: string | null
  theme_tag: string
  audio_filename?: string | null
  audio_url?: string | null
  youtube_id: string
  start_time?: number | null
  position?: number | null
}

function parseArgs(): { file: string; dryRun: boolean } {
  const args = process.argv.slice(2)
  let file = ''
  let dryRun = false
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      file = args[++i]
    } else if (args[i] === '--dry-run') {
      dryRun = true
    }
  }
  if (!file) {
    console.error('Usage: npm run db:seed-mp3s -- --file <path.json> [--dry-run]')
    process.exit(1)
  }
  return { file, dryRun }
}

function loadRows(filePath: string): Mp3TrackInput[] {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)
  const raw = JSON.parse(fs.readFileSync(abs, 'utf8'))
  if (!Array.isArray(raw)) {
    throw new Error('JSON root must be an array of track objects')
  }
  return raw as Mp3TrackInput[]
}

function displayTitle(row: Mp3TrackInput): string {
  const title = row.title.trim()
  const artist = row.artist?.trim()
  if (artist) return `${title} — ${artist}`
  return title
}

function resolveStoredAudioUrl(row: Mp3TrackInput): string | null {
  const direct = row.audio_url?.trim()
  if (direct) return direct
  const filename = row.audio_filename?.trim()
  if (!filename) return null
  return resolveAudioClipUrl(filename)
}

async function main(): Promise<void> {
  const { file, dryRun } = parseArgs()
  const rows = loadRows(file)

  let connectionString = process.env.DATABASE_URL?.trim()?.replace(/^"+|"+$/g, '')
  if (!connectionString) {
    console.error('DATABASE_URL is not set in .env.local.')
    process.exit(1)
  }
  try {
    connectionString = decodeURIComponent(connectionString)
  } catch {
    // keep encoded
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
  await client.connect()

  try {
    await client.query(
      `ALTER TABLE public.theme_songs ADD COLUMN IF NOT EXISTS audio_url text`
    )
    await client.query(
      `ALTER TABLE public.theme_songs ADD COLUMN IF NOT EXISTS start_time int NOT NULL DEFAULT 0`
    )

    const themeCache = new Map<string, string>()
    let inserted = 0
    let skipped = 0

    for (const row of rows) {
      const themeTag = row.theme_tag?.trim()
      const youtubeId = row.youtube_id?.trim()
      if (!themeTag || !youtubeId || !row.title?.trim()) {
        console.warn('Skipping row missing theme_tag, youtube_id, or title:', row)
        skipped++
        continue
      }

      let themeId = themeCache.get(themeTag.toLowerCase())
      if (!themeId) {
        const themeRes = await client.query<{ id: string }>(
          `SELECT id FROM public.themes WHERE lower(name) = lower($1) LIMIT 1`,
          [themeTag]
        )
        themeId = themeRes.rows[0]?.id
        if (!themeId) {
          console.warn(`Theme not found for tag "${themeTag}" — skipping "${row.title}"`)
          skipped++
          continue
        }
        themeCache.set(themeTag.toLowerCase(), themeId)
      }

      const audioUrl = resolveStoredAudioUrl(row)
      const startTime = Math.max(0, Math.floor(row.start_time ?? 0))
      const title = displayTitle(row)

      let position = row.position
      if (position == null || !Number.isFinite(position)) {
        const posRes = await client.query<{ max: number | null }>(
          `SELECT max(position)::int AS max FROM public.theme_songs WHERE theme_id = $1`,
          [themeId]
        )
        position = (posRes.rows[0]?.max ?? -1) + 1
      }

      if (dryRun) {
        console.log(`[dry-run] ${title} → theme=${themeTag} pos=${position} mp3=${audioUrl ?? '(none)'}`)
        inserted++
        continue
      }

      await client.query(
        `INSERT INTO public.theme_songs (theme_id, youtube_id, title, position, audio_url, start_time)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [themeId, youtubeId, title, position, audioUrl, startTime]
      )
      inserted++
    }

    await client.query(`NOTIFY pgrst, 'reload schema'`)
    console.log(`\nMP3 seed complete: ${inserted} row(s) processed, ${skipped} skipped${dryRun ? ' (dry-run)' : ''}.`)
  } finally {
    await client.end()
  }
}

main().catch((err: Error) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})

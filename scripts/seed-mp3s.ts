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
 *   "artist": "Artist Name",
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
  youtube_id?: string | null
  start_time?: number | null
  position?: number | null
}

type SanitizedRow = {
  title: string
  artist: string
  theme_tag: string
  youtube_id: string
  audio_filename?: string | null
  audio_url?: string | null
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

function sanitizeRow(row: Mp3TrackInput): SanitizedRow {
  return {
    title: row.title?.trim() ?? '',
    artist: row.artist?.trim() ?? '',
    theme_tag: row.theme_tag?.trim() ?? '',
    youtube_id: row.youtube_id?.trim() ?? '',
    audio_filename: row.audio_filename?.trim() || null,
    audio_url: row.audio_url?.trim() || null,
    start_time: row.start_time,
    position: row.position,
  }
}

function validateRow(row: SanitizedRow): string | null {
  if (!row.title) return 'missing title'
  if (!row.artist) return 'missing artist'
  if (!row.theme_tag) return 'missing theme_tag'
  return null
}

function resolveStoredAudioUrl(row: SanitizedRow): string | null {
  if (row.audio_url) return row.audio_url
  if (row.audio_filename) return resolveAudioClipUrl(row.audio_filename)
  return null
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

  const themeCache = new Map<string, string>()
  let seeded = 0
  let skippedInvalid = 0
  let duplicatesHandled = 0

  try {
    for (const raw of rows) {
      const row = sanitizeRow(raw)
      const validationError = validateRow(row)
      if (validationError) {
        console.warn(
          `Skipping invalid row (${validationError}): title="${row.title || '(empty)'}", artist="${row.artist || '(empty)'}", theme_tag="${row.theme_tag || '(empty)'}"`
        )
        skippedInvalid++
        continue
      }

      let themeId = themeCache.get(row.theme_tag.toLowerCase())
      if (!themeId) {
        const themeRes = await client.query<{ id: string }>(
          `SELECT id FROM public.themes WHERE lower(name) = lower($1) LIMIT 1`,
          [row.theme_tag]
        )
        themeId = themeRes.rows[0]?.id
        if (!themeId) {
          console.warn(
            `Skipping invalid row (theme not found): title="${row.title}", artist="${row.artist}", theme_tag="${row.theme_tag}"`
          )
          skippedInvalid++
          continue
        }
        themeCache.set(row.theme_tag.toLowerCase(), themeId)
      }

      const audioUrl = resolveStoredAudioUrl(row)
      const startTime = Math.max(0, Math.floor(row.start_time ?? 0))
      const youtubeId = row.youtube_id || 'pending'

      let position = row.position
      if (position == null || !Number.isFinite(position)) {
        const posRes = await client.query<{ max: number | null }>(
          `SELECT max(position)::int AS max FROM public.theme_songs WHERE theme_id = $1`,
          [themeId]
        )
        position = (posRes.rows[0]?.max ?? -1) + 1
      }

      const label = `${row.title} — ${row.artist} (${row.theme_tag})`

      if (dryRun) {
        console.log(`[dry-run] ${label} pos=${position} mp3=${audioUrl ?? '(none)'}`)
        seeded++
        continue
      }

      const upsertRes = await client.query<{ is_insert: boolean }>(
        `INSERT INTO public.theme_songs (
           theme_id, youtube_id, title, artist, theme_tag, position, audio_url, start_time
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (title, artist, theme_tag) DO UPDATE SET
           theme_id = EXCLUDED.theme_id,
           youtube_id = EXCLUDED.youtube_id,
           position = EXCLUDED.position,
           audio_url = COALESCE(EXCLUDED.audio_url, public.theme_songs.audio_url),
           start_time = EXCLUDED.start_time
         RETURNING (xmax = 0) AS is_insert`,
        [themeId, youtubeId, row.title, row.artist, row.theme_tag, position, audioUrl, startTime]
      )

      const isInsert = upsertRes.rows[0]?.is_insert
      if (isInsert) {
        seeded++
      } else {
        duplicatesHandled++
      }
    }

    if (!dryRun) {
      await client.query(`NOTIFY pgrst, 'reload schema'`)
    }

    console.log(
      `\nSuccessfully seeded: ${seeded} | Skipped invalid: ${skippedInvalid} | Updated/Duplicates handled: ${duplicatesHandled}${dryRun ? ' (dry-run)' : ''}.`
    )
  } finally {
    await client.end()
  }
}

main().catch((err: Error) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})

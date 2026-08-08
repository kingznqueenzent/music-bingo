#!/usr/bin/env node
/**
 * Import local backup tracks into Supabase (public.songs + media storage bucket).
 *
 * Scans a backup folder for:
 *   - MP3/M4A/WAV files (uploads to storage bucket "media", inserts catalog rows)
 *   - CSV metadata (title, artist, year, theme_name, …)
 *   - Base44 JSON exports in exports/ (MediaLibrary.json, Songs.json, Themes.json)
 *
 * Usage:
 *   npm run db:import-backup
 *   npm run db:import-backup -- --dir "../lyricgrid zip files april 13th 2026/backup"
 *   npm run db:import-backup -- --dry-run
 */
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import type { Database } from '../types/database.types'
import { parseTitleArtist } from '../lib/media/track-genres'
import { buildThemeLookup, resolveThemeId, type CsvTheme } from '../lib/media/resolve-theme-from-csv'
import { connectPg } from './lib/pg-connect'

dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true })

const AUDIO_EXT = new Set(['.mp3', '.m4a', '.wav', '.flac', '.ogg', '.aac'])
const JSON_EXPORT_NAMES = ['MediaLibrary.json', 'Songs.json', 'Themes.json', 'media_library.json', 'songs.json', 'themes.json']

type ImportTrack = {
  title: string
  artist: string | null
  year: number | null
  themeHint: string | null
  youtubeUrl: string | null
  startTimeSec: number
  durationSec: number
  mediaUrl: string | null
  storagePath: string | null
  localFile: string | null
  source: 'audio' | 'csv' | 'json'
}

type CliOptions = {
  dir: string
  dryRun: boolean
  skipUpload: boolean
  replaceAudio: boolean
}

type ThemeRow = { id: string; name: string }

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  let dir = ''
  let dryRun = false
  let skipUpload = false
  let replaceAudio = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--dir' && args[i + 1]) {
      dir = args[++i]
    } else if (arg === '--dry-run') {
      dryRun = true
    } else if (arg === '--skip-upload') {
      skipUpload = true
    } else if (arg === '--replace-audio') {
      replaceAudio = true
    }
  }

  if (!dir) {
    const candidates = [
      path.join(__dirname, '..', 'backup'),
      path.join(__dirname, '..', '..', 'lyricgrid zip files april 13th 2026', 'backup'),
      path.join(process.cwd(), 'backup'),
    ]
    dir = candidates.find((c) => fs.existsSync(c)) ?? candidates[0]
  }

  return {
    dir: path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir),
    dryRun,
    skipUpload,
    replaceAudio,
  }
}

function readJsonArray<T>(filePath: string): T[] {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown
  if (Array.isArray(raw)) return raw as T[]
  if (raw && typeof raw === 'object') {
    const obj = raw as { records?: unknown; data?: unknown }
    if (Array.isArray(obj.records)) return obj.records as T[]
    if (Array.isArray(obj.data)) return obj.data as T[]
  }
  return []
}

function walkFiles(root: string, predicate: (filePath: string) => boolean): string[] {
  const out: string[] = []
  if (!fs.existsSync(root)) return out

  const stack = [root]
  while (stack.length) {
    const current = stack.pop()!
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name.toLowerCase() !== 'node_modules') {
          stack.push(full)
        }
      } else if (predicate(full)) {
        out.push(full)
      }
    }
  }
  return out.sort()
}

function themeHintFromPath(filePath: string, backupRoot: string): string | null {
  const rel = path.relative(backupRoot, filePath)
  const parts = rel.split(path.sep)
  if (parts.length < 2) return null
  const folder = parts[parts.length - 2]
  if (!folder || folder.toLowerCase() === 'audio' || folder.toLowerCase() === 'exports') return null
  return folder
}

function sanitizeStorageSegment(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'track'
}

function trackKey(title: string, artist: string | null, themeId: string | null): string {
  return `${title.trim().toLowerCase()}::${(artist ?? '').trim().toLowerCase()}::${themeId ?? ''}`
}

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }

  values.push(current.trim())
  return values.map((v) => v.replace(/^"|"$/g, ''))
}

function parseCsvTracks(csvPath: string, backupRoot: string): ImportTrack[] {
  const text = fs.readFileSync(csvPath, 'utf8')
  const lines = text.split(/\r\n|\n/).filter((line) => line.trim())
  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase())
  const tracks: ImportTrack[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? ''
    })

    const title = row.title?.trim()
    if (!title) continue

    tracks.push({
      title,
      artist: row.artist?.trim() || null,
      year: row.year ? Number.parseInt(row.year, 10) || null : null,
      themeHint: row.theme_name || row.theme || themeHintFromPath(csvPath, backupRoot),
      youtubeUrl: row.youtube_url?.trim() || null,
      startTimeSec: row.start_time_sec ? Number.parseInt(row.start_time_sec, 10) || 0 : 0,
      durationSec: row.duration_sec ? Number.parseInt(row.duration_sec, 10) || 35 : 35,
      mediaUrl: row.media_url?.trim() || row.audio_url?.trim() || null,
      storagePath: row.storage_path?.trim() || null,
      localFile: null,
      source: 'csv',
    })
  }

  return tracks
}

function parseAudioTracks(filePath: string, backupRoot: string): ImportTrack {
  const base = path.basename(filePath)
  const parsed = parseTitleArtist(base)
  return {
    title: parsed.title,
    artist: parsed.artist,
    year: null,
    themeHint: themeHintFromPath(filePath, backupRoot),
    youtubeUrl: null,
    startTimeSec: 0,
    durationSec: 35,
    mediaUrl: null,
    storagePath: null,
    localFile: filePath,
    source: 'audio',
  }
}

function parseJsonExports(exportsDir: string): ImportTrack[] {
  const tracks: ImportTrack[] = []
  const themeById = new Map<string, string>()

  for (const name of ['Themes.json', 'themes.json', 'Playlists.json', 'playlists.json']) {
    const filePath = path.join(exportsDir, name)
    if (!fs.existsSync(filePath)) continue
    for (const row of readJsonArray<{ id?: string; name?: string }>(filePath)) {
      if (row.id && row.name) themeById.set(row.id, row.name)
    }
  }

  for (const name of ['Songs.json', 'songs.json', 'theme_songs.json']) {
    const filePath = path.join(exportsDir, name)
    if (!fs.existsSync(filePath)) continue
    for (const row of readJsonArray<{
      title?: string
      name?: string
      artist?: string
      theme_id?: string
      audio_url?: string
      youtube_url?: string
      start_time?: number
    }>(filePath)) {
      const title = (row.title ?? row.name ?? '').trim()
      if (!title) continue
      tracks.push({
        title,
        artist: row.artist?.trim() || null,
        year: null,
        themeHint: row.theme_id ? themeById.get(row.theme_id) ?? null : null,
        youtubeUrl: row.youtube_url?.trim() || null,
        startTimeSec: Math.max(0, Math.floor(row.start_time ?? 0)),
        durationSec: 35,
        mediaUrl: row.audio_url?.trim() || null,
        storagePath: null,
        localFile: null,
        source: 'json',
      })
    }
  }

  for (const name of ['MediaLibrary.json', 'media_library.json']) {
    const filePath = path.join(exportsDir, name)
    if (!fs.existsSync(filePath)) continue
    for (const row of readJsonArray<{
      name?: string
      title?: string
      artist?: string
      theme_id?: string
      file_url?: string
      file_path?: string
    }>(filePath)) {
      const raw = row.name ?? row.title ?? ''
      const parsed = parseTitleArtist(raw)
      const title = (row.title ?? parsed.title).trim()
      if (!title) continue
      tracks.push({
        title,
        artist: row.artist?.trim() || parsed.artist,
        year: null,
        themeHint: row.theme_id ? themeById.get(row.theme_id) ?? null : null,
        youtubeUrl: null,
        startTimeSec: 0,
        durationSec: 35,
        mediaUrl: row.file_url?.trim() || null,
        storagePath: row.file_path?.trim() || null,
        localFile: null,
        source: 'json',
      })
    }
  }

  return tracks
}

function collectTracks(backupRoot: string): ImportTrack[] {
  if (!fs.existsSync(backupRoot)) {
    throw new Error(`Backup folder not found: ${backupRoot}`)
  }

  const tracks: ImportTrack[] = []
  const exportsDir = fs.existsSync(path.join(backupRoot, 'exports'))
    ? path.join(backupRoot, 'exports')
    : backupRoot

  tracks.push(...parseJsonExports(exportsDir))

  for (const csvPath of walkFiles(backupRoot, (p) => {
    const base = path.basename(p).toLowerCase()
    return p.toLowerCase().endsWith('.csv') && !base.includes('.example.')
  })) {
    tracks.push(...parseCsvTracks(csvPath, backupRoot))
  }

  for (const audioPath of walkFiles(backupRoot, (p) => AUDIO_EXT.has(path.extname(p).toLowerCase()))) {
    tracks.push(parseAudioTracks(audioPath, backupRoot))
  }

  return tracks
}

function dedupeTracks(tracks: ImportTrack[]): ImportTrack[] {
  const byKey = new Map<string, ImportTrack>()
  for (const track of tracks) {
    const key = `${track.title.toLowerCase()}::${(track.artist ?? '').toLowerCase()}::${track.localFile ?? track.mediaUrl ?? ''}`
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, track)
      continue
    }
    if (!existing.localFile && track.localFile) byKey.set(key, track)
    else if (!existing.mediaUrl && track.mediaUrl) byKey.set(key, { ...existing, mediaUrl: track.mediaUrl })
  }
  return [...byKey.values()]
}

function contentTypeForFile(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.mp3') return 'audio/mpeg'
  if (ext === '.m4a') return 'audio/mp4'
  if (ext === '.wav') return 'audio/wav'
  if (ext === '.ogg') return 'audio/ogg'
  if (ext === '.flac') return 'audio/flac'
  return 'application/octet-stream'
}

async function loadThemes(client: Awaited<ReturnType<typeof connectPg>>['client']): Promise<ThemeRow[]> {
  const { rows } = await client.query<ThemeRow>(`SELECT id, name FROM public.themes ORDER BY name`)
  return rows
}

async function loadExistingSongKeys(client: Awaited<ReturnType<typeof connectPg>>['client']): Promise<Set<string>> {
  const { rows } = await client.query<{ title: string; artist: string | null; theme_id: string | null }>(
    `SELECT title, artist, theme_id FROM public.songs`
  )
  return new Set(rows.map((r) => trackKey(r.title, r.artist, r.theme_id)))
}

async function songsHasColumn(
  client: Awaited<ReturnType<typeof connectPg>>['client'],
  column: string
): Promise<boolean> {
  const { rows } = await client.query<{ ok: number }>(
    `SELECT 1 AS ok FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'songs' AND column_name = $1
     LIMIT 1`,
    [column]
  )
  return rows.length > 0
}

async function uploadLocalAudio(
  supabase: ReturnType<typeof createClient<Database>>,
  track: ImportTrack,
  themeSlug: string,
  replaceAudio: boolean
): Promise<{ mediaUrl: string; storagePath: string } | null> {
  if (!track.localFile || !fs.existsSync(track.localFile)) return null

  const filename = sanitizeStorageSegment(path.basename(track.localFile))
  const storagePath = `backup-import/${themeSlug}/${filename}`
  const fileBuffer = fs.readFileSync(track.localFile)

  const { data: existing } = await supabase.storage.from('media').list(path.dirname(storagePath), {
    search: path.basename(storagePath),
  })
  const alreadyThere = existing?.some((obj) => obj.name === path.basename(storagePath))

  if (alreadyThere && !replaceAudio) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')
    return {
      mediaUrl: `${supabaseUrl}/storage/v1/object/public/media/${storagePath}`,
      storagePath,
    }
  }

  const { error } = await supabase.storage.from('media').upload(storagePath, fileBuffer, {
    contentType: contentTypeForFile(track.localFile),
    upsert: replaceAudio,
  })
  if (error) throw new Error(`Storage upload failed for ${track.localFile}: ${error.message}`)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')
  return {
    mediaUrl: `${supabaseUrl}/storage/v1/object/public/media/${storagePath}`,
    storagePath,
  }
}

async function main(): Promise<void> {
  const opts = parseArgs()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const databaseUrl = process.env.DATABASE_URL?.trim()

  if (!databaseUrl) {
    console.error('DATABASE_URL is not set in music-bingo/.env.local')
    process.exit(1)
  }
  if (!supabaseUrl || !serviceKey) {
    console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in music-bingo/.env.local')
    process.exit(1)
  }

  console.log('LyricGrid backup import')
  console.log('=======================')
  console.log(`Backup folder: ${opts.dir}`)
  console.log(`Dry run: ${opts.dryRun}`)
  console.log(`Skip upload: ${opts.skipUpload}`)
  console.log('')

  const tracks = dedupeTracks(collectTracks(opts.dir))
  if (tracks.length === 0) {
    console.error('No importable tracks found.')
    console.error('Add MP3s under backup/audio/, CSV metadata, or Base44 JSON in backup/exports/.')
    process.exit(1)
  }

  console.log(`Found ${tracks.length} track(s) to process.`)

  const { client, label } = await connectPg(databaseUrl)
  console.log(`Connected via ${label}`)

  const themes = await loadThemes(client)
  const themeLookup = buildThemeLookup(themes as CsvTheme[])
  const existingKeys = await loadExistingSongKeys(client)
  const hasStoragePath = await songsHasColumn(client, 'storage_path')
  const supabase = createClient<Database>(supabaseUrl, serviceKey)

  let uploaded = 0
  let inserted = 0
  let skipped = 0
  let errors = 0

  try {
    for (const track of tracks) {
      const themeId = track.themeHint ? resolveThemeId(track.themeHint, themeLookup) : null
      const themeSlug = track.themeHint
        ? track.themeHint.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'general'
        : 'general'

      let mediaUrl = track.mediaUrl
      let storagePath = track.storagePath

      if (!opts.skipUpload && track.localFile) {
        if (opts.dryRun) {
          console.log(`[dry-run] upload ${track.localFile}`)
          uploaded++
        } else {
          try {
            const uploadedFile = await uploadLocalAudio(supabase, track, themeSlug, opts.replaceAudio)
            if (uploadedFile) {
              mediaUrl = uploadedFile.mediaUrl
              storagePath = uploadedFile.storagePath
              uploaded++
            }
          } catch (err) {
            console.error(`  ✗ upload ${track.localFile}:`, err instanceof Error ? err.message : err)
            errors++
            continue
          }
        }
      }

      const key = trackKey(track.title, track.artist, themeId)
      if (existingKeys.has(key)) {
        skipped++
        continue
      }

      const mediaType = track.youtubeUrl ? 'youtube' : mediaUrl ? 'audio' : 'audio'

      if (opts.dryRun) {
        console.log(
          `[dry-run] insert "${track.title}"${track.artist ? ` — ${track.artist}` : ''}` +
            `${track.themeHint ? ` [${track.themeHint}]` : ''}` +
            `${mediaUrl ? ' + audio' : ''}`
        )
        inserted++
        continue
      }

      const { error } = await supabase.from('songs').insert({
        title: track.title,
        artist: track.artist,
        year: track.year,
        theme_id: themeId,
        media_type: mediaType,
        media_url: mediaUrl,
        youtube_url: track.youtubeUrl,
        start_time_sec: track.startTimeSec,
        duration_sec: track.durationSec,
        ...(hasStoragePath && storagePath ? { storage_path: storagePath } : {}),
      })

      if (error) {
        if (/duplicate key|unique constraint/i.test(error.message)) {
          skipped++
        } else {
          console.error(`  ✗ insert "${track.title}": ${error.message}`)
          errors++
        }
        continue
      }

      existingKeys.add(key)
      inserted++
    }

    if (!opts.dryRun) {
      await client.query(`NOTIFY pgrst, 'reload schema'`)
    }

    const { rows: stats } = await client.query<{ total: number; with_audio: number }>(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE media_url IS NOT NULL${
                hasStoragePath ? ' OR storage_path IS NOT NULL' : ''
              })::int AS with_audio
       FROM public.songs`
    )

    console.log('\n=== Import complete ===')
    console.log(`  Uploaded audio files: ${uploaded}`)
    console.log(`  Inserted catalog rows: ${inserted}`)
    console.log(`  Skipped duplicates: ${skipped}`)
    console.log(`  Errors: ${errors}`)
    console.log(`  Total songs in Supabase: ${stats[0]?.total ?? 0} (${stats[0]?.with_audio ?? 0} with audio)`)
  } finally {
    await client.end()
  }
}

main().catch((err: Error) => {
  console.error('Import failed:', err.message)
  process.exit(1)
})

#!/usr/bin/env node
/**
 * Import Kingz & Queenz YouTube Music Database (.xlsx) into public.songs.
 *
 * Column map (Master Music Database sheet):
 *   Song Title → title
 *   Artist     → artist
 *   Genre      → theme (matched / created in public.themes)
 *   Source / DJ Notes / Data Quality Notes → youtube_url when a YouTube link is present
 *
 * Note: the Updated spreadsheet is primarily a Content ID / livestream suitability
 * catalog — most rows have MixVerify "Source" URLs, not YouTube watch links.
 *
 * Usage:
 *   npm run db:import-kq-xlsx
 *   npm run db:import-kq-xlsx -- --dry-run
 *   npm run db:import-kq-xlsx -- --file "C:\\path\\to\\file.xlsx"
 *   npm run db:import-kq-xlsx -- --create-themes   # create missing genre themes (default on)
 *   npm run db:import-kq-xlsx -- --no-create-themes
 *
 * Requires DATABASE_URL in .env.local.
 */
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import dotenv from 'dotenv'
import * as XLSX from 'xlsx'
import {
  extractYoutubeVideoId,
  normalizeYoutubeUrl,
} from '../lib/media/normalize-youtube-url'
import { buildThemeLookup, resolveThemeId } from '../lib/media/resolve-theme-from-csv'

const require = createRequire(import.meta.url)
const { connectPg } = require('./lib/pg-connect.js')

dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true })

const DEFAULT_FILE =
  process.env.KQ_XLSX_PATH?.trim() ||
  path.join(
    process.env.USERPROFILE || process.env.HOME || '',
    'Downloads',
    'Kingz_Queenz_YouTube_Music_Database_Master_Updated.xlsx'
  )

const BATCH = 100
const SHEET = 'Master Music Database'

/** Spreadsheet Genre → preferred public.themes.name */
const GENRE_ALIASES: Record<string, string> = {
  'hip hop': 'Hip-Hop & R&B',
  hiphop: 'Hip-Hop & R&B',
  'hip-hop': 'Hip-Hop & R&B',
  rap: 'Hip-Hop & R&B',
  dancehall: 'Dancehall Reggae',
  'dancehall reggae': 'Dancehall Reggae',
  afrobeats: 'Afrobeat',
  afrobeat: 'Afrobeat',
  'afro-pop': 'Afropop',
  afropop: 'Afropop',
  'r&b': 'R&B',
  rnb: 'R&B',
  'neo soul': 'Afro-Soul',
  'neo-soul': 'Afro-Soul',
  country: 'Country Music',
  amapiano: 'Amapiano',
  disco: 'Disco',
  funk: 'Funk',
  reggae: 'Reggae',
  electronic: 'Electronic',
  house: 'House',
  pop: 'Pop',
  soca: 'Soca',
  soul: 'Soul',
}

type ParsedRow = {
  title: string
  artist: string | null
  genreRaw: string | null
  youtubeUrl: string | null
  mediaType: 'audio' | 'youtube'
  sourceNote: string | null
}

function argValue(flag: string): string | null {
  const i = process.argv.indexOf(flag)
  if (i === -1) return null
  return process.argv[i + 1] ?? null
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

function cell(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = row[key]
    if (v == null) continue
    const s = String(v).trim()
    if (s) return s
  }
  return ''
}

function pickYoutubeUrl(row: Record<string, unknown>): string | null {
  const candidates = [
    cell(row, 'YouTube URL', 'Youtube URL', 'YouTube', 'URL', 'Link'),
    cell(row, 'Source'),
    cell(row, 'DJ Notes'),
    cell(row, 'Data Quality Notes'),
    cell(row, 'Playlist / Set'),
  ]
  for (const raw of candidates) {
    if (!raw) continue
    if (extractYoutubeVideoId(raw)) return normalizeYoutubeUrl(raw)
    // Sometimes notes embed a URL mid-string
    const match = raw.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/\S+|youtu\.be\/\S+)/i)
    if (match?.[0] && extractYoutubeVideoId(match[0])) return normalizeYoutubeUrl(match[0])
  }
  return null
}

function normalizeKey(title: string, artist: string | null): string {
  return `${title.trim().toLowerCase()}::${(artist ?? '').trim().toLowerCase()}`
}

function resolveGenreThemeName(genreRaw: string | null): string | null {
  if (!genreRaw?.trim()) return null
  const trimmed = genreRaw.trim()
  const alias = GENRE_ALIASES[trimmed.toLowerCase()]
  return alias ?? trimmed
}

function parseWorkbook(filePath: string): ParsedRow[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Excel file not found: ${filePath}`)
  }

  const wb = XLSX.readFile(filePath)
  const sheetName =
    wb.SheetNames.find((n) => n.toLowerCase() === SHEET.toLowerCase()) ?? wb.SheetNames[0]
  if (!sheetName) throw new Error('Workbook has no sheets')

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], {
    defval: '',
    raw: false,
  })

  const parsed: ParsedRow[] = []
  for (const row of rows) {
    const title = cell(row, 'Song Title', 'Title', 'Track', 'Name')
    if (!title) continue
    const artist = cell(row, 'Artist', 'Artists') || null
    const genreRaw = cell(row, 'Genre', 'Theme', 'Category') || null
    const youtubeUrl = pickYoutubeUrl(row)
    const source = cell(row, 'Source') || null
    parsed.push({
      title,
      artist,
      genreRaw,
      youtubeUrl,
      mediaType: youtubeUrl ? 'youtube' : 'audio',
      sourceNote: source && !youtubeUrl ? source : null,
    })
  }
  return parsed
}

type PgClient = {
  query: <T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ) => Promise<{ rows: T[]; rowCount: number | null }>
}

function rememberTheme(lookup: Map<string, string>, id: string, name: string): void {
  for (const [k, v] of buildThemeLookup([{ id, name }])) lookup.set(k, v)
}

async function ensureTheme(
  client: PgClient,
  themeName: string,
  lookup: Map<string, string>,
  createMissing: boolean
): Promise<{ id: string | null; created: boolean }> {
  const existing = resolveThemeId(themeName, lookup)
  if (existing) return { id: existing, created: false }
  if (!createMissing) return { id: null, created: false }

  const found = await client.query<{ id: string; name: string }>(
    `SELECT id, name FROM public.themes WHERE lower(trim(name)) = lower(trim($1)) LIMIT 1`,
    [themeName]
  )
  if (found.rows[0]) {
    rememberTheme(lookup, found.rows[0].id, found.rows[0].name)
    return { id: found.rows[0].id, created: false }
  }

  const { rows } = await client.query<{ id: string; name: string }>(
    `INSERT INTO public.themes (name, category, display_order)
     VALUES (
       $1,
       'genre',
       COALESCE((SELECT MAX(display_order) + 1 FROM public.themes), 0)
     )
     RETURNING id, name`,
    [themeName]
  )

  if (rows[0]) {
    rememberTheme(lookup, rows[0].id, rows[0].name)
    return { id: rows[0].id, created: true }
  }
  return { id: null, created: false }
}

async function main(): Promise<void> {
  const dryRun = hasFlag('--dry-run')
  const createThemes = !hasFlag('--no-create-themes')
  const filePath = argValue('--file') || DEFAULT_FILE

  console.log(`Reading: ${filePath}`)
  const parsed = parseWorkbook(filePath)
  console.log(`Parsed ${parsed.length} track row(s) from sheet.`)

  const withYoutube = parsed.filter((p) => p.youtubeUrl).length
  const genreCounts = new Map<string, number>()
  for (const p of parsed) {
    const g = p.genreRaw?.trim() || '(blank)'
    genreCounts.set(g, (genreCounts.get(g) || 0) + 1)
  }
  console.log(`Rows with YouTube URL: ${withYoutube}`)
  console.log(
    `Unique genres: ${genreCounts.size} (top: ${[...genreCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([g, n]) => `${g}=${n}`)
      .join(', ')})`
  )

  if (dryRun) {
    console.log('\n--dry-run: skipping database writes.')
    console.log('Sample mapped rows:')
    for (const row of parsed.slice(0, 5)) {
      console.log(
        `  • ${row.title} — ${row.artist ?? 'Unknown'} | genre=${row.genreRaw ?? '—'} | yt=${row.youtubeUrl ?? 'none'}`
      )
    }
    return
  }

  const rawUrl = process.env.DATABASE_URL
  if (!rawUrl?.trim()) {
    throw new Error('DATABASE_URL is not set in .env.local')
  }

  const { client, label } = await connectPg(rawUrl)
  console.log(`Connected via ${label}`)

  try {
    const themeRes = await client.query(
      `SELECT id, name FROM public.themes ORDER BY display_order, name`
    )
    const lookup = buildThemeLookup(
      themeRes.rows.map((r: { id: string; name: string }) => ({ id: r.id, name: r.name }))
    )
    const before = await client.query(`SELECT COUNT(*)::int AS n FROM public.songs`)
    const existing = await client.query(`SELECT title, artist FROM public.songs`)
    const existingKeys = new Set(
      existing.rows.map((r: { title: string; artist: string | null }) =>
        normalizeKey(r.title, r.artist)
      )
    )

    let inserted = 0
    let skippedDup = 0
    let skippedInvalid = 0
    let themesCreated = 0
    let unthemed = 0

    type InsertRow = {
      title: string
      artist: string | null
      theme_id: string | null
      media_type: string
      youtube_url: string | null
      media_url: null
      start_time_sec: number
      duration_sec: number
    }

    const batch: InsertRow[] = []

    async function flush(): Promise<void> {
      if (batch.length === 0) return
      const chunk = batch.splice(0, batch.length)
      const values: unknown[] = []
      const placeholders: string[] = []
      chunk.forEach((row, i) => {
        const o = i * 8
        placeholders.push(
          `($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6}, $${o + 7}, $${o + 8})`
        )
        values.push(
          row.title,
          row.artist,
          row.theme_id,
          row.media_type,
          row.youtube_url,
          row.media_url,
          row.start_time_sec,
          row.duration_sec
        )
      })
      const result = await client.query(
        `INSERT INTO public.songs
           (title, artist, theme_id, media_type, youtube_url, media_url, start_time_sec, duration_sec)
         VALUES ${placeholders.join(', ')}
         RETURNING id`,
        values
      )
      inserted += result.rowCount ?? 0
    }

    for (const row of parsed) {
      const title = row.title.trim()
      if (!title) {
        skippedInvalid += 1
        continue
      }
      const artist = row.artist?.trim() || null
      const key = normalizeKey(title, artist)
      if (existingKeys.has(key)) {
        skippedDup += 1
        continue
      }
      existingKeys.add(key)

      const themeName = resolveGenreThemeName(row.genreRaw)
      let themeId: string | null = null
      if (themeName) {
        const ensured = await ensureTheme(client, themeName, lookup, createThemes)
        themeId = ensured.id
        if (ensured.created) themesCreated += 1
      }
      if (!themeId) unthemed += 1

      batch.push({
        title,
        artist,
        theme_id: themeId,
        media_type: row.mediaType,
        youtube_url: row.youtubeUrl,
        media_url: null,
        start_time_sec: 0,
        duration_sec: 35,
      })

      if (batch.length >= BATCH) await flush()
    }
    await flush()

    const after = await client.query(`SELECT COUNT(*)::int AS n FROM public.songs`)
    const byMedia = await client.query(
      `SELECT media_type, COUNT(*)::int AS n FROM public.songs GROUP BY media_type ORDER BY media_type`
    )

    console.log('\n=== Import summary ===')
    console.log(`Parsed from Excel:     ${parsed.length}`)
    console.log(`Inserted into songs:   ${inserted}`)
    console.log(`Skipped (duplicates):  ${skippedDup}`)
    console.log(`Skipped (invalid):     ${skippedInvalid}`)
    console.log(`Themes created:        ${themesCreated}`)
    console.log(`Rows without theme:    ${unthemed}`)
    console.log(`songs before → after:  ${before.rows[0].n} → ${after.rows[0].n}`)
    console.log(
      `By media_type:          ${byMedia.rows
        .map((r: { media_type: string; n: number }) => `${r.media_type}=${r.n}`)
        .join(', ')}`
    )
    if (withYoutube === 0) {
      console.log(
        '\nNote: this spreadsheet has no YouTube watch URLs — tracks were inserted as media_type=audio with null youtube_url/media_url (metadata catalog). Attach audio or YouTube links later in Media Manager.'
      )
    }
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})

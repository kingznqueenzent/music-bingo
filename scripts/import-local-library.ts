#!/usr/bin/env node
/**
 * Batch import local MP3 library into Supabase Storage + public.songs.
 *
 * Folder layouts supported:
 *   1) Genre/Year/Artist/Track.mp3          (full library scan)
 *   2) Genre/2020s Country/Artist/Track.mp3   (decade theme folders)
 *   3) Genre/2020s Country/Artist - Title.mp3 (flat files with artist in filename)
 *
 * Usage:
 *   npm run db:import-library -- --dir "F:\\Music\\All Music Folder\\Country\\2020's Country"
 *   npm run db:import-library -- --root "F:\\Music\\All Music Folder" --batch-size 25
 *   npm run db:import-library -- --dir "F:\\Music\\All Music Folder\\Rock" --theme Rock
 *   npm run db:import-library -- --dir "..." --dry-run
 */
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import type { Database } from '../types/database.types'
import { buildThemeLookup, resolveThemeId, type CsvTheme } from '../lib/media/resolve-theme-from-csv'
import { connectPg } from './lib/pg-connect'

dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true })

const DEFAULT_BATCH_SIZE = 25
const AUDIO_EXT = new Set(['.mp3', '.m4a', '.wav', '.flac', '.ogg', '.aac'])

type ParsedTrack = {
  filePath: string
  title: string
  artist: string
  genre: string | null
  era: string | null
  themeName: string
  year: number | null
}

type CliOptions = {
  root: string | null
  dir: string | null
  theme: string | null
  batchSize: number
  dryRun: boolean
  replaceAudio: boolean
}

type ThemeRow = { id: string; name: string }

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  let root: string | null = null
  let dir: string | null = null
  let theme: string | null = null
  let batchSize = DEFAULT_BATCH_SIZE
  let dryRun = false
  let replaceAudio = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--root' && args[i + 1]) root = args[++i]
    else if (arg === '--dir' && args[i + 1]) dir = args[++i]
    else if (arg === '--theme' && args[i + 1]) theme = args[++i]
    else if (arg === '--batch-size' && args[i + 1]) batchSize = Math.max(1, Number.parseInt(args[++i], 10) || DEFAULT_BATCH_SIZE)
    else if (arg === '--dry-run') dryRun = true
    else if (arg === '--replace-audio') replaceAudio = true
  }

  return {
    root: root ? path.resolve(root) : null,
    dir: dir ? path.resolve(dir) : null,
    theme: theme?.trim() || null,
    batchSize,
    dryRun,
    replaceAudio,
  }
}

function normalizeApostrophe(value: string): string {
  return value.replace(/[''`´]/g, "'")
}

function cleanTitle(value: string): string {
  return value
    .replace(/\.[^/.]+$/, '')
    .replace(/\s*\((main|clean|dirty|radio edit|explicit|remix|album version|single version)[^)]*\)\s*$/i, '')
    .replace(/\s*\[[^\]]*\]\s*$/g, '')
    .trim()
}

function stripTrackNumberPrefix(value: string): string {
  return value.replace(/^\d{1,3}[.\s_-]+\s*/, '').trim()
}

function humanizeUnderscoreSlug(value: string): string {
  return value.replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
}

function isGenericBillboardFolder(name: string): boolean {
  const n = name.toLowerCase()
  return (
    n === 'billboard' ||
    n.startsWith('unknown -') ||
    n.startsWith('unknown-') ||
    n.includes('billboard hot') ||
    n.includes('billboard top') ||
    n.includes('billboard music') ||
    n.includes('billboard riddim')
  )
}

function parseArtistTitleFromFilename(filePath: string): { artist: string; title: string } {
  const base = stripTrackNumberPrefix(path.basename(filePath, path.extname(filePath)))

  const catalog = base.match(/^Billboard-\d{4}-\d{3}-(.+?)-(.+)$/i)
  if (catalog) {
    return { artist: catalog[1].trim(), title: cleanTitle(catalog[2]) }
  }

  const topHits = base.match(/^Billboard Top Hits \d{4}\s*[-–—]\s*(.+?)\s*[-–—]\s*(.+)$/i)
  if (topHits) {
    return { artist: topHits[1].trim(), title: cleanTitle(topHits[2]) }
  }

  const underscore = base.match(/^\d{1,3}[-_.\s]+(.+?)_{1,2}-_{0,2}(.+)$/i)
  if (underscore) {
    return {
      artist: humanizeUnderscoreSlug(underscore[1]),
      title: cleanTitle(humanizeUnderscoreSlug(underscore[2])),
    }
  }

  const match = base.match(/^(.+?)\s[-–—]\s(.+)$/)
  if (match) {
    return { artist: match[1].trim(), title: cleanTitle(match[2]) }
  }
  return { artist: 'Unknown Artist', title: cleanTitle(base) }
}

function parseArtistFromFolderName(folderName: string): string | null {
  const cleaned = stripTrackNumberPrefix(folderName.trim())
  const parsed = parseArtistTitleFromFilename(`${cleaned}.mp3`)
  if (parsed.artist !== 'Unknown Artist') return parsed.artist
  return cleaned || null
}

function extractEraLabel(folderName: string): string | null {
  const normalized = normalizeApostrophe(folderName).toLowerCase()
  if (/^20\d0s/.test(normalized) || normalized.includes('2020')) return '2020s'
  if (normalized.includes('2010')) return '2010s'
  if (normalized.includes('2000')) return '2000s'
  if (normalized.includes('1990') || normalized.includes('90s')) return '90s'
  if (normalized.includes('1980') || normalized.includes('80s')) return '80s'
  if (normalized.includes('1970') || normalized.includes('70s')) return '70s'
  if (normalized.includes('1960') || normalized.includes('60s')) return '60s'
  if (normalized.includes('1950') || normalized.includes('50s')) return '50s'
  return null
}

function extractYearInt(value: string | null | undefined): number | null {
  if (!value) return null
  const match = value.match(/\b(19\d{2}|20\d{2})\b/)
  if (!match) return null
  const year = Number.parseInt(match[1], 10)
  return Number.isFinite(year) ? year : null
}

function buildThemeName(genre: string | null, era: string | null): string | null {
  if (!genre || !era) return null
  const genreLabel = genre.trim()
  const eraLabel = era.endsWith('s') ? era : `${era}s`
  return `${eraLabel} ${genreLabel}`
}

function sanitizeStorageSegment(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'track'
}

function walkMp3Files(root: string): string[] {
  const files: string[] = []
  const stack = [root]
  while (stack.length) {
    const current = stack.pop()!
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && !entry.name.startsWith('$')) stack.push(full)
      } else if (AUDIO_EXT.has(path.extname(entry.name).toLowerCase())) {
        files.push(full)
      }
    }
  }
  return files.sort()
}

function inferGenreFromScanRoot(scanRoot: string): string | null {
  const base = path.basename(scanRoot)
  if (!base || base === '.' ) return null
  const era = extractEraLabel(base)
  if (era) {
    return base.replace(/20\d0s/i, '').replace(/['']/g, '').trim() || null
  }
  return base
}

function parseTrackFromPath(
  filePath: string,
  scanRoot: string,
  fixedTheme: string | null = null
): ParsedTrack | null {
  const rel = path.relative(scanRoot, filePath)
  const parts = rel.split(path.sep)
  if (parts.length < 1) return null

  const fileName = parts[parts.length - 1]
  const scanGenre = inferGenreFromScanRoot(scanRoot)
  let genre: string | null = scanGenre
  let era: string | null = null
  let artist: string | null = null
  let title: string | null = null

  if (fixedTheme) {
    if (parts.length >= 2 && !isGenericBillboardFolder(parts[0])) {
      const folderArtist = parseArtistFromFolderName(parts[0])
      const parsed = parseArtistTitleFromFilename(fileName)
      artist = parsed.artist !== 'Unknown Artist' ? parsed.artist : folderArtist
      title = parsed.title
    } else {
      const parsed = parseArtistTitleFromFilename(fileName)
      artist = parsed.artist
      title = parsed.title
    }
    genre = fixedTheme

    if (!title?.trim() || !artist?.trim()) return null

    return {
      filePath,
      title: title.trim(),
      artist: artist.trim(),
      genre,
      era: null,
      themeName: fixedTheme,
      year: extractYearInt(parts[0]) ?? extractYearInt(parts[1]) ?? null,
    }
  }

  if (parts.length >= 4) {
    genre = parts[0]
    era = extractEraLabel(parts[1]) ?? parts[1]
    artist = parts[2]
    title = cleanTitle(path.basename(fileName, path.extname(fileName)))
  } else if (parts.length === 3) {
    genre = parts[0]
    era = extractEraLabel(parts[1]) ?? parts[1]
    const parsed = parseArtistTitleFromFilename(fileName)
    artist = parsed.artist
    title = parsed.title
  } else if (parts.length === 2) {
    const parent = parts[0]
    const parentEra = extractEraLabel(parent)
    if (parentEra) {
      era = parentEra
      genre = parent.replace(/20\d0s/i, '').replace(/['']/g, '').trim() || 'Country'
      const parsed = parseArtistTitleFromFilename(fileName)
      artist = parsed.artist
      title = parsed.title
    } else {
      artist = parent
      title = cleanTitle(path.basename(fileName, path.extname(fileName)))
      genre = 'Country'
      era = '2020s'
    }
  } else {
    const parsed = parseArtistTitleFromFilename(fileName)
    artist = parsed.artist
    title = parsed.title
    genre = 'Country'
    era = '2020s'
  }

  if (!title?.trim() || !artist?.trim()) return null

  const themeName =
    buildThemeName(genre, era) ??
    buildThemeName('Country', '2020s') ??
    '2020s Country'

  return {
    filePath,
    title: title.trim(),
    artist: artist.trim(),
    genre,
    era,
    themeName,
    year: extractYearInt(parts[1]) ?? extractYearInt(parts[0]) ?? null,
  }
}

function parseTracksForScanRoot(scanRoot: string, fixedTheme: string | null = null): ParsedTrack[] {
  return walkMp3Files(scanRoot)
    .map((filePath) => parseTrackFromPath(filePath, scanRoot, fixedTheme))
    .filter((track): track is ParsedTrack => track !== null)
}

function trackKey(title: string, artist: string, themeId: string | null): string {
  return `${title.trim().toLowerCase()}::${artist.trim().toLowerCase()}::${themeId ?? ''}`
}

async function songsHasColumn(client: Awaited<ReturnType<typeof connectPg>>['client'], column: string): Promise<boolean> {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'songs' AND column_name = $1
     LIMIT 1`,
    [column]
  )
  return rows.length > 0
}

async function loadThemes(client: Awaited<ReturnType<typeof connectPg>>['client']): Promise<ThemeRow[]> {
  const { rows } = await client.query<ThemeRow>(`SELECT id, name FROM public.themes ORDER BY name`)
  return rows
}

async function ensureThemeExists(
  client: Awaited<ReturnType<typeof connectPg>>['client'],
  themeName: string
): Promise<void> {
  const { rows } = await client.query<{ id: string }>(
    `SELECT id FROM public.themes WHERE lower(trim(name)) = lower(trim($1)) LIMIT 1`,
    [themeName]
  )
  if (rows.length > 0) return

  await client.query(
    `INSERT INTO public.themes (name, category, description, display_order)
     VALUES ($1, 'genre', $2, 999)`,
    [themeName, `LyricGrid genre playlist: ${themeName}`]
  )
  console.log(`Created missing theme: ${themeName}`)
}

async function loadExistingKeys(client: Awaited<ReturnType<typeof connectPg>>['client']): Promise<Set<string>> {
  const { rows } = await client.query<{ title: string; artist: string | null; theme_id: string | null }>(
    `SELECT title, artist, theme_id FROM public.songs`
  )
  return new Set(rows.map((r) => trackKey(r.title, r.artist ?? 'Unknown Artist', r.theme_id)))
}

function contentTypeForFile(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.mp3') return 'audio/mpeg'
  if (ext === '.m4a') return 'audio/mp4'
  if (ext === '.wav') return 'audio/wav'
  return 'application/octet-stream'
}

async function uploadTrack(
  supabase: ReturnType<typeof createClient<Database>>,
  track: ParsedTrack,
  replaceAudio: boolean
): Promise<{ mediaUrl: string; storagePath: string }> {
  const themeSlug = sanitizeStorageSegment(track.themeName)
  const artistSlug = sanitizeStorageSegment(track.artist)
  const fileSlug = sanitizeStorageSegment(path.basename(track.filePath))
  const storagePath = `library/${themeSlug}/${artistSlug}/${fileSlug}`
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')

  if (!replaceAudio) {
    const { data: existing } = await supabase.storage.from('media').list(path.dirname(storagePath), {
      search: path.basename(storagePath),
    })
    if (existing?.some((obj) => obj.name === path.basename(storagePath))) {
      return {
        mediaUrl: `${supabaseUrl}/storage/v1/object/public/media/${storagePath}`,
        storagePath,
      }
    }
  }

  const fileBuffer = fs.readFileSync(track.filePath)
  const { error } = await supabase.storage.from('media').upload(storagePath, fileBuffer, {
    contentType: contentTypeForFile(track.filePath),
    upsert: replaceAudio,
  })
  if (error) throw new Error(error.message)

  return {
    mediaUrl: `${supabaseUrl}/storage/v1/object/public/media/${storagePath}`,
    storagePath,
  }
}

async function processBatch(
  batch: ParsedTrack[],
  batchIndex: number,
  totalBatches: number,
  opts: CliOptions,
  supabase: ReturnType<typeof createClient<Database>>,
  themeLookup: Map<string, string>,
  existingKeys: Set<string>,
  hasStoragePath: boolean,
  counters: { uploaded: number; inserted: number; skipped: number; errors: number },
  globalIndex: { value: number },
  totalTracks: number
): Promise<void> {
  console.log(`\nBatch ${batchIndex}/${totalBatches} (${batch.length} tracks)`)

  for (const track of batch) {
    globalIndex.value += 1
    const n = globalIndex.value
    const prefix = `[${n}/${totalTracks}]`

    const themeId = resolveThemeId(track.themeName, themeLookup)
    if (!themeId) {
      console.log(`${prefix} ✗ SKIP  ${track.artist} — ${track.title}`)
      console.log(`         theme not found: "${track.themeName}"`)
      counters.errors += 1
      continue
    }

    const key = trackKey(track.title, track.artist, themeId)
    if (existingKeys.has(key)) {
      console.log(`${prefix} ↷ DUP   ${track.artist} — ${track.title} | theme=${track.themeName}`)
      counters.skipped += 1
      continue
    }

    try {
      if (opts.dryRun) {
        console.log(
          `${prefix} ✓ DRY   ${track.artist} — ${track.title} | theme=${track.themeName}` +
            `${track.year ? ` | year=${track.year}` : ''}`
        )
        counters.inserted += 1
        continue
      }

      const uploaded = await uploadTrack(supabase, track, opts.replaceAudio)
      counters.uploaded += 1

      const payload = {
        title: track.title,
        artist: track.artist,
        year: track.year,
        theme_id: themeId,
        media_type: 'audio' as const,
        media_url: uploaded.mediaUrl,
        youtube_url: null,
        start_time_sec: 0,
        duration_sec: 35,
        ...(hasStoragePath ? { storage_path: uploaded.storagePath } : {}),
      }

      const { error } = await supabase.from('songs').insert(payload)
      if (error) {
        if (/duplicate key|unique constraint/i.test(error.message)) {
          console.log(`${prefix} ↷ DUP   ${track.artist} — ${track.title} | theme=${track.themeName}`)
          counters.skipped += 1
          continue
        }
        throw new Error(error.message)
      }

      existingKeys.add(key)
      counters.inserted += 1
      console.log(
        `${prefix} ✓ OK    ${track.artist} — ${track.title} | theme=${track.themeName}` +
          `${track.year ? ` | year=${track.year}` : ''} | uploaded`
      )
    } catch (err) {
      counters.errors += 1
      const message = err instanceof Error ? err.message : String(err)
      console.log(`${prefix} ✗ FAIL  ${track.artist} — ${track.title}`)
      console.log(`         ${message}`)
    }
  }
}

async function main(): Promise<void> {
  const opts = parseArgs()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const databaseUrl = process.env.DATABASE_URL?.trim()

  if (!opts.root && !opts.dir) {
    console.error('Provide --dir for a specific folder or --root for a full library scan.')
    process.exit(1)
  }
  if (!databaseUrl || !supabaseUrl || !serviceKey) {
    console.error('Set DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }

  const scanRoot = opts.dir ?? opts.root!
  if (!fs.existsSync(scanRoot)) {
    console.error(`Path not found: ${scanRoot}`)
    process.exit(1)
  }

  const fixedTheme = opts.theme ?? null

  console.log('LyricGrid local library import')
  console.log('==============================')
  console.log(`Scan root: ${scanRoot}`)
  if (fixedTheme) console.log(`Fixed theme: ${fixedTheme}`)
  console.log(`Batch size: ${opts.batchSize}`)
  console.log(`Dry run: ${opts.dryRun}`)
  console.log('')

  const tracks = parseTracksForScanRoot(scanRoot, fixedTheme)
  if (tracks.length === 0) {
    console.error('No MP3 files found to import.')
    process.exit(1)
  }

  console.log(`Discovered ${tracks.length} MP3 file(s).`)

  const { client, label } = await connectPg(databaseUrl)
  console.log(`Connected via ${label}`)

  if (fixedTheme && !opts.dryRun) {
    await ensureThemeExists(client, fixedTheme)
  }

  const themes = await loadThemes(client)
  const themeLookup = buildThemeLookup(themes as CsvTheme[])
  const existingKeys = await loadExistingKeys(client)
  const hasStoragePath = await songsHasColumn(client, 'storage_path')
  const supabase = createClient<Database>(supabaseUrl, serviceKey)

  const counters = { uploaded: 0, inserted: 0, skipped: 0, errors: 0 }
  const globalIndex = { value: 0 }
  const totalBatches = Math.ceil(tracks.length / opts.batchSize)

  try {
    for (let i = 0; i < tracks.length; i += opts.batchSize) {
      const batch = tracks.slice(i, i + opts.batchSize)
      await processBatch(
        batch,
        Math.floor(i / opts.batchSize) + 1,
        totalBatches,
        opts,
        supabase,
        themeLookup,
        existingKeys,
        hasStoragePath,
        counters,
        globalIndex,
        tracks.length
      )
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

    console.log('\n=== Import summary ===')
    console.log(`  Uploaded: ${counters.uploaded}`)
    console.log(`  Inserted: ${counters.inserted}`)
    console.log(`  Skipped duplicates: ${counters.skipped}`)
    console.log(`  Errors: ${counters.errors}`)
    console.log(`  Total songs in Supabase: ${stats[0]?.total ?? 0} (${stats[0]?.with_audio ?? 0} with audio)`)
  } finally {
    await client.end()
  }
}

main().catch((err: Error) => {
  console.error('Import failed:', err.message)
  process.exit(1)
})

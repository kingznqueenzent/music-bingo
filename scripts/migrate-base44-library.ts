#!/usr/bin/env node
/**
 * Base44 → Supabase catalog migration.
 * Reads public/exports/*.json, maps theme_id → genre, inserts into bingo_game_tracks in batches of 500.
 *
 * Usage:
 *   npm run db:migrate-base44
 *   npm run db:migrate-base44 -- --replace   # clear library rows first
 */
import fs from 'fs'
import path from 'path'
import { Client } from 'pg'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import type { Database } from '../types/database.types'
import { inferTrackGenre, parseTitleArtist } from '../lib/media/track-genres'

dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true })

const BATCH_SIZE = 500
const EXPORTS_DIR = path.join(__dirname, '..', 'public', 'exports')
const LIBRARY_MIGRATION = '20260626120000_bingo_game_tracks_library.sql'

type ThemeRow = {
  id: string
  name?: string
  genre_id?: string | null
  era_id?: string | null
}

type GenreRow = { id: string; name: string }
type EraRow = { id: string; name: string }

type CatalogInsert = {
  title: string
  artist: string | null
  genre: string | null
  theme_id: string | null
  file_url: string | null
  file_path: string | null
}

function readJsonFile<T>(dir: string, names: string[]): T[] {
  for (const name of names) {
    const filePath = path.join(dir, name)
    if (!fs.existsSync(filePath)) continue
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown
      if (Array.isArray(raw)) return raw as T[]
      if (raw && typeof raw === 'object' && Array.isArray((raw as { records?: unknown }).records)) {
        return (raw as { records: T[] }).records
      }
      if (raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)) {
        return (raw as { data: T[] }).data
      }
      console.warn(`  ${name}: unexpected shape — skipped`)
    } catch (e) {
      console.warn(`  ${name}: parse error —`, e instanceof Error ? e.message : e)
    }
  }
  return []
}

function normalizeKey(title: string, artist: string | null): string {
  return `${title.trim().toLowerCase()}::${(artist ?? '').trim().toLowerCase()}`
}

function resolveGenre(
  themeId: string | null | undefined,
  themeById: Map<string, ThemeRow>,
  genreById: Map<string, GenreRow>,
  eraById: Map<string, EraRow>
): string | null {
  if (!themeId) return null
  const theme = themeById.get(themeId)
  if (!theme) return null
  const parentGenre = theme.genre_id ? genreById.get(theme.genre_id)?.name : null
  const era = theme.era_id ? eraById.get(theme.era_id)?.name : null
  return inferTrackGenre({
    themeName: theme.name,
    parentGenreName: parentGenre,
    eraName: era,
  })
}

async function ensureLibrarySchema(client: Client): Promise<void> {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'bingo_game_tracks' AND column_name = 'genre'`
  )
  if (rows.length > 0) return
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', LIBRARY_MIGRATION)
  if (!fs.existsSync(sqlPath)) throw new Error(`Missing ${LIBRARY_MIGRATION}`)
  console.log(`Applying ${LIBRARY_MIGRATION}…`)
  await client.query(fs.readFileSync(sqlPath, 'utf8'))
}

function collectFromExports(
  themes: ThemeRow[],
  genres: GenreRow[],
  eras: EraRow[]
): CatalogInsert[] {
  const themeById = new Map(themes.map((t) => [t.id, t]))
  const genreById = new Map(genres.map((g) => [g.id, g]))
  const eraById = new Map(eras.map((e) => [e.id, e]))
  const out: CatalogInsert[] = []

  const songs = readJsonFile<{
    theme_id?: string
    title?: string
    name?: string
    artist?: string
    youtube_id?: string
  }>(EXPORTS_DIR, ['Songs.json', 'songs.json', 'theme_songs.json', 'ThemeSongs.json'])

  for (const row of songs) {
    const title = (row.title ?? row.name ?? '').trim()
    if (!title) continue
    const artist = row.artist?.trim() || null
    out.push({
      title,
      artist,
      genre: resolveGenre(row.theme_id, themeById, genreById, eraById),
      theme_id: row.theme_id ?? null,
      file_url: null,
      file_path: null,
    })
  }

  const media = readJsonFile<{
    name?: string
    title?: string
    artist?: string
    theme_id?: string
    file_url?: string
    file_path?: string
  }>(EXPORTS_DIR, ['MediaLibrary.json', 'media_library.json', 'MediaLibrary.export.json'])

  for (const row of media) {
    const raw = row.name ?? row.title ?? ''
    const parsed = parseTitleArtist(raw)
    const title = (row.title ?? parsed.title).trim()
    if (!title) continue
    out.push({
      title,
      artist: row.artist?.trim() || parsed.artist,
      genre: resolveGenre(row.theme_id, themeById, genreById, eraById),
      theme_id: row.theme_id ?? null,
      file_url: row.file_url ?? null,
      file_path: row.file_path ?? null,
    })
  }

  return out
}

function collectFromSeedJson(): CatalogInsert[] {
  const seedPath = path.join(__dirname, 'seed-tracks-library.json')
  if (!fs.existsSync(seedPath)) return []
  const rows = JSON.parse(fs.readFileSync(seedPath, 'utf8')) as {
    title: string
    artist?: string
    genre?: string
  }[]
  return rows.map((r) => ({
    title: r.title.trim(),
    artist: r.artist?.trim() || null,
    genre: r.genre?.trim() || null,
    theme_id: null,
    file_url: null,
    file_path: null,
  }))
}

async function collectFromDatabase(client: Client): Promise<CatalogInsert[]> {
  const themesRes = await client.query<ThemeRow>(
    `SELECT id, name, genre_id, era_id FROM public.themes`
  )
  const genresRes = await client.query<GenreRow>(`SELECT id, name FROM public.genres`)
  const erasRes = await client.query<EraRow>(`SELECT id, name FROM public.eras`)
  const themeById = new Map(themesRes.rows.map((t) => [t.id, t]))
  const genreById = new Map(genresRes.rows.map((g) => [g.id, g]))
  const eraById = new Map(erasRes.rows.map((e) => [e.id, e]))
  const out: CatalogInsert[] = []

  const themeSongs = await client.query<{ theme_id: string; title: string | null }>(
    `SELECT theme_id, title FROM public.theme_songs WHERE title IS NOT NULL AND trim(title) <> ''`
  )
  for (const row of themeSongs.rows) {
    const title = row.title?.trim()
    if (!title) continue
    out.push({
      title,
      artist: null,
      genre: resolveGenre(row.theme_id, themeById, genreById, eraById),
      theme_id: row.theme_id,
      file_url: null,
      file_path: null,
    })
  }

  const media = await client.query<{
    name: string
    theme_id: string | null
    file_url: string | null
    file_path: string | null
  }>(`SELECT name, theme_id, file_url, file_path FROM public.media_library`)
  for (const row of media.rows) {
    const parsed = parseTitleArtist(row.name)
    out.push({
      title: parsed.title,
      artist: parsed.artist,
      genre: resolveGenre(row.theme_id, themeById, genreById, eraById),
      theme_id: row.theme_id,
      file_url: row.file_url,
      file_path: row.file_path,
    })
  }

  return out
}

function dedupeRows(rows: CatalogInsert[]): CatalogInsert[] {
  const seen = new Set<string>()
  const out: CatalogInsert[] = []
  for (const row of rows) {
    const key = normalizeKey(row.title, row.artist)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(row)
  }
  return out
}

async function insertBatch(client: Client, batch: CatalogInsert[]): Promise<number> {
  if (batch.length === 0) return 0
  const values: unknown[] = []
  const placeholders: string[] = []
  let i = 1
  for (const row of batch) {
    placeholders.push(
      `($${i}, $${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5})`
    )
    values.push(row.title, row.artist, row.genre, row.theme_id, row.file_url, row.file_path)
    i += 6
  }
  const sql = `
    INSERT INTO public.bingo_game_tracks
      (title, artist, genre, theme_id, file_url, file_path, game_id, played)
    SELECT v.title, v.artist, v.genre, v.theme_id::uuid, v.file_url, v.file_path, NULL, false
    FROM (VALUES ${placeholders.map((p) => `${p}`).join(', ')}) AS v(title, artist, genre, theme_id, file_url, file_path)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.bingo_game_tracks b
      WHERE b.game_id IS NULL
        AND lower(trim(b.title)) = lower(trim(v.title))
        AND lower(trim(coalesce(b.artist, ''))) = lower(trim(coalesce(v.artist, '')))
    )
  `
  const result = await client.query(sql, values)
  return result.rowCount ?? 0
}

async function insertBatchSupabase(
  supabase: ReturnType<typeof createSupabaseClient<Database>>,
  batch: CatalogInsert[],
  existingKeys: Set<string>
): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0
  let skipped = 0
  const rows = batch
    .map((row) => {
      const key = normalizeKey(row.title, row.artist)
      if (existingKeys.has(key)) {
        skipped++
        return null
      }
      return {
        title: row.title,
        artist: row.artist,
        genre: row.genre,
        theme_id: row.theme_id,
        file_url: row.file_url,
        file_path: row.file_path,
        game_id: null,
        played: false,
      }
    })
    .filter(Boolean) as {
    title: string
    artist: string | null
    genre: string | null
    theme_id: string | null
    file_url: string | null
    file_path: string | null
    game_id: null
    played: boolean
  }[]

  if (rows.length === 0) return { inserted, skipped }

  const { data, error } = await supabase.from('bingo_game_tracks').insert(rows).select('id, title, artist')
  if (error) {
    if (/duplicate key|unique constraint/i.test(error.message)) {
      for (const row of rows) {
        const key = normalizeKey(row.title, row.artist)
        const { error: oneErr } = await supabase.from('bingo_game_tracks').insert(row)
        if (oneErr) {
          if (/duplicate key|unique constraint/i.test(oneErr.message)) skipped++
          else throw new Error(oneErr.message)
        } else {
          inserted++
          existingKeys.add(key)
        }
      }
      return { inserted, skipped }
    }
    throw new Error(error.message)
  }

  for (const row of data ?? []) {
    existingKeys.add(normalizeKey(row.title, row.artist ?? null))
  }
  inserted += data?.length ?? 0
  return { inserted, skipped }
}

async function runViaSupabaseRest(allRows: CatalogInsert[], replace: boolean): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !key) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for REST fallback.')
  }

  const supabase = createSupabaseClient<Database>(url, key)
  console.log('Using Supabase REST client (DATABASE_URL unavailable).')

  if (replace) {
    const { error: delErr } = await supabase.from('bingo_game_tracks').delete().is('game_id', null)
    if (delErr) throw new Error(delErr.message)
    console.log('Cleared existing library rows (game_id IS NULL).')
  }

  const { data: existing } = await supabase
    .from('bingo_game_tracks')
    .select('title, artist')
    .is('game_id', null)
  const existingKeys = new Set((existing ?? []).map((r) => normalizeKey(r.title, r.artist)))

  let inserted = 0
  let skipped = 0
  for (let offset = 0; offset < allRows.length; offset += BATCH_SIZE) {
    const batch = allRows.slice(offset, offset + BATCH_SIZE)
    const batchNum = Math.floor(offset / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(allRows.length / BATCH_SIZE)
    console.log(`Inserting batch ${batchNum}/${totalBatches} (${batch.length} rows) via REST…`)
    const result = await insertBatchSupabase(supabase, batch, existingKeys)
    inserted += result.inserted
    skipped += result.skipped
  }

  const { data: allLibrary } = await supabase.from('bingo_game_tracks').select('genre').is('game_id', null)
  const byGenre = new Map<string, number>()
  for (const row of allLibrary ?? []) {
    const g = row.genre?.trim() || '(no genre)'
    byGenre.set(g, (byGenre.get(g) ?? 0) + 1)
  }

  console.log('\n=== Migration complete (REST) ===')
  console.log(`  Inserted this run: ${inserted}`)
  console.log(`  Skipped (duplicate): ${skipped}`)
  console.log(`  Total library tracks in Supabase: ${allLibrary?.length ?? 0}`)
  console.log('  By genre:')
  for (const [genre, n] of [...byGenre.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${genre}: ${n}`)
  }
}

async function main(): Promise<void> {
  const replace = process.argv.includes('--replace')

  console.log('Base44 library migration → bingo_game_tracks')
  console.log(`Exports directory: ${EXPORTS_DIR}`)

  const exportThemes = readJsonFile<ThemeRow>(EXPORTS_DIR, [
    'Themes.json',
    'themes.json',
    'Playlists.json',
    'playlists.json',
  ])
  const exportGenres = readJsonFile<GenreRow>(EXPORTS_DIR, ['Genres.json', 'genres.json'])
  const exportEras = readJsonFile<EraRow>(EXPORTS_DIR, ['Eras.json', 'eras.json'])

  const fromExports = collectFromExports(exportThemes, exportGenres, exportEras)
  const fromSeed = collectFromSeedJson()

  console.log(`  From exports JSON: ${fromExports.length} raw rows`)
  console.log(`  From seed-tracks-library.json: ${fromSeed.length} rows`)

  let fromDb: CatalogInsert[] = []
  let allRows = dedupeRows([...fromExports, ...fromSeed])

  let connectionString = process.env.DATABASE_URL?.trim()?.replace(/^"+|"+$/g, '')
  if (connectionString) {
    try {
      connectionString = decodeURIComponent(connectionString)
    } catch {
      // keep encoded
    }
  }

  if (!connectionString) {
    console.warn('DATABASE_URL not set — trying Supabase REST only.')
    if (allRows.length === 0) {
      console.error('\nNo tracks to insert. Add Base44 JSON to public/exports/.')
      process.exit(1)
    }
    await runViaSupabaseRest(allRows, replace)
    return
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
  try {
    await client.connect()
  } catch (pgErr) {
    console.warn(`Postgres connect failed (${pgErr instanceof Error ? pgErr.message : pgErr}) — trying REST.`)
    if (allRows.length === 0) {
      console.error('\nNo tracks to insert. Add Base44 JSON to public/exports/.')
      process.exit(1)
    }
    await runViaSupabaseRest(allRows, replace)
    return
  }

  try {
    await ensureLibrarySchema(client)

    let fromDbLocal: CatalogInsert[] = []
    try {
      fromDbLocal = await collectFromDatabase(client)
      console.log(`  From live theme_songs + media_library: ${fromDbLocal.length} rows`)
    } catch (e) {
      console.warn('  Could not read theme_songs/media_library:', e instanceof Error ? e.message : e)
    }

    allRows = dedupeRows([...fromExports, ...fromSeed, ...fromDbLocal])
    console.log(`  Unique catalog rows to upsert: ${allRows.length}`)

    if (allRows.length === 0) {
      console.error(
        '\nNo tracks found. Add Base44 JSON exports to public/exports/ or ensure theme_songs are seeded in Supabase.'
      )
      process.exit(1)
    }

    if (replace) {
      const del = await client.query(`DELETE FROM public.bingo_game_tracks WHERE game_id IS NULL`)
      console.log(`Cleared ${del.rowCount ?? 0} existing library row(s).`)
    }

    let inserted = 0
    let skipped = 0
    for (let offset = 0; offset < allRows.length; offset += BATCH_SIZE) {
      const batch = allRows.slice(offset, offset + BATCH_SIZE)
      const batchNum = Math.floor(offset / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(allRows.length / BATCH_SIZE)
      console.log(`Inserting batch ${batchNum}/${totalBatches} (${batch.length} rows)…`)
      const n = await insertBatch(client, batch)
      inserted += n
      skipped += batch.length - n
    }

    await client.query(`NOTIFY pgrst, 'reload schema'`)

    const { rows: counts } = await client.query(
      `SELECT coalesce(genre, '(no genre)') AS genre, COUNT(*)::int AS n
       FROM public.bingo_game_tracks WHERE game_id IS NULL
       GROUP BY genre ORDER BY n DESC, genre`
    )
    const { rows: totalRow } = await client.query(
      `SELECT COUNT(*)::int AS n FROM public.bingo_game_tracks WHERE game_id IS NULL`
    )

    console.log('\n=== Migration complete ===')
    console.log(`  Inserted this run: ${inserted}`)
    console.log(`  Skipped (duplicate): ${skipped}`)
    console.log(`  Total library tracks in Supabase: ${totalRow[0]?.n ?? 0}`)
    console.log('  By genre:')
    for (const row of counts) {
      console.log(`    ${row.genre}: ${row.n}`)
    }
  } finally {
    await client.end()
  }
}

main().catch((err: Error) => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})

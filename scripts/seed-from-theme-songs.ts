#!/usr/bin/env node
/**
 * Fallback seed: sync all public.theme_songs into bingo_game_tracks library (game_id IS NULL).
 *
 * Usage:
 *   npm run db:seed-from-theme-songs
 *   npm run db:seed-from-theme-songs -- --replace
 */
import path from 'path'
import { Client } from 'pg'
import dotenv from 'dotenv'
import { inferTrackGenre } from '../lib/media/track-genres'

dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true })

const BATCH_SIZE = 100
const LIBRARY_MIGRATION = '20260626120000_bingo_game_tracks_library.sql'

type ThemeRow = { id: string; name: string; genre_id: string | null; era_id: string | null }
type GenreRow = { id: string; name: string }
type EraRow = { id: string; name: string }

type ThemeSongRow = {
  id: string
  theme_id: string
  youtube_id: string
  title: string | null
  position: number
}

function resolveGenre(
  themeId: string,
  themeById: Map<string, ThemeRow>,
  genreById: Map<string, GenreRow>,
  eraById: Map<string, EraRow>
): string | null {
  const theme = themeById.get(themeId)
  if (!theme) return null
  return inferTrackGenre({
    themeName: theme.name,
    parentGenreName: theme.genre_id ? genreById.get(theme.genre_id)?.name : null,
    eraName: theme.era_id ? eraById.get(theme.era_id)?.name : null,
  })
}

function libraryTitle(row: ThemeSongRow, themeName: string): string {
  const trimmed = row.title?.trim()
  if (trimmed) return trimmed
  const safeTheme = themeName.trim() || 'Theme'
  return `${row.youtube_id.trim()} · ${safeTheme} (${row.id.slice(0, 8)})`
}

function youtubeWatchUrl(youtubeId: string): string {
  return `https://www.youtube.com/watch?v=${youtubeId.trim()}`
}

function themeSongFilePath(themeSongId: string): string {
  return `theme_songs/${themeSongId}`
}

async function ensureLibrarySchema(client: Client): Promise<void> {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'bingo_game_tracks' AND column_name = 'genre'`
  )
  if (rows.length > 0) return
  const fs = await import('fs')
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', LIBRARY_MIGRATION)
  console.log(`Applying ${LIBRARY_MIGRATION}…`)
  await client.query(fs.readFileSync(sqlPath, 'utf8'))
}

async function insertBatch(
  client: Client,
  batch: {
    title: string
    genre: string | null
    theme_id: string
    file_url: string
    file_path: string
  }[]
): Promise<number> {
  if (batch.length === 0) return 0
  const values: unknown[] = []
  const placeholders = batch
    .map((row, i) => {
      const base = i * 5
      values.push(row.title, row.genre, row.theme_id, row.file_url, row.file_path)
      return `($${base + 1}, NULL, $${base + 2}, $${base + 3}::uuid, $${base + 4}, $${base + 5}, NULL, false)`
    })
    .join(', ')
  const result = await client.query(
    `INSERT INTO public.bingo_game_tracks (title, artist, genre, theme_id, file_url, file_path, game_id, played)
     VALUES ${placeholders}`,
    values
  )
  return result.rowCount ?? batch.length
}

async function main(): Promise<void> {
  const replaceAll = process.argv.includes('--replace')

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
    await ensureLibrarySchema(client)

    const themesRes = await client.query<ThemeRow>(`SELECT id, name, genre_id, era_id FROM public.themes`)
    const genresRes = await client.query<GenreRow>(`SELECT id, name FROM public.genres`)
    const erasRes = await client.query<EraRow>(`SELECT id, name FROM public.eras`)
    const songsRes = await client.query<ThemeSongRow>(
      `SELECT id, theme_id, youtube_id, title, position
       FROM public.theme_songs
       ORDER BY theme_id, position, id`
    )

    const themeById = new Map(themesRes.rows.map((t) => [t.id, t]))
    const genreById = new Map(genresRes.rows.map((g) => [g.id, g]))
    const eraById = new Map(erasRes.rows.map((e) => [e.id, e]))

    console.log(`theme_songs in database: ${songsRes.rows.length}`)

    if (replaceAll) {
      const del = await client.query(`DELETE FROM public.bingo_game_tracks WHERE game_id IS NULL`)
      console.log(`Cleared ${del.rowCount ?? 0} library row(s) (--replace).`)
    } else {
      const delSynced = await client.query(
        `DELETE FROM public.bingo_game_tracks
         WHERE game_id IS NULL AND file_path LIKE 'theme_songs/%'`
      )
      const delOrphans = await client.query(
        `DELETE FROM public.bingo_game_tracks
         WHERE game_id IS NULL
           AND file_path IS NULL
           AND theme_id IS NOT NULL`
      )
      console.log(
        `Removed ${delSynced.rowCount ?? 0} prior theme_songs sync row(s), ${delOrphans.rowCount ?? 0} orphan theme row(s).`
      )
    }

    const rows = songsRes.rows.map((s) => {
      const theme = themeById.get(s.theme_id)
      return {
        title: libraryTitle(s, theme?.name ?? 'Theme'),
        genre: resolveGenre(s.theme_id, themeById, genreById, eraById),
        theme_id: s.theme_id,
        file_url: youtubeWatchUrl(s.youtube_id),
        file_path: themeSongFilePath(s.id),
      }
    })

    let inserted = 0
    for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
      const batch = rows.slice(offset, offset + BATCH_SIZE)
      const batchNum = Math.floor(offset / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(rows.length / BATCH_SIZE)
      console.log(`Inserting batch ${batchNum}/${totalBatches} (${batch.length} rows)…`)
      inserted += await insertBatch(client, batch)
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
    const { rows: syncedRow } = await client.query(
      `SELECT COUNT(*)::int AS n FROM public.bingo_game_tracks
       WHERE game_id IS NULL AND file_path LIKE 'theme_songs/%'`
    )

    console.log('\n=== theme_songs → bingo_game_tracks complete ===')
    console.log(`  theme_songs synced: ${syncedRow[0]?.n ?? 0} / ${songsRes.rows.length}`)
    console.log(`  Total library tracks: ${totalRow[0]?.n ?? 0}`)
    console.log('  By genre:')
    for (const row of counts) {
      console.log(`    ${row.genre}: ${row.n}`)
    }
  } finally {
    await client.end()
  }
}

main().catch((err: Error) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})

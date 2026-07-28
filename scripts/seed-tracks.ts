#!/usr/bin/env node
/**
 * Seed host media catalog into public.bingo_game_tracks (game_id NULL, genre set).
 *
 * Usage:
 *   npm run db:seed-tracks
 *   npm run db:seed-tracks -- --replace   # delete existing library rows first
 *
 * Requires DATABASE_URL in .env.local.
 * Edit scripts/seed-tracks-catalog.ts with your track list before running.
 */
import path from 'path'
import { Client } from 'pg'
import dotenv from 'dotenv'
import { TRACK_LIBRARY, catalogTrackCount } from './seed-tracks-catalog'

dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true })

const LIBRARY_MIGRATION = '20260626120000_bingo_game_tracks_library.sql'

async function ensureLibrarySchema(client: Client): Promise<void> {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'bingo_game_tracks' AND column_name = 'genre'`
  )
  if (rows.length > 0) return

  const fs = await import('fs')
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', LIBRARY_MIGRATION)
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Missing migration ${LIBRARY_MIGRATION}. Run db:apply-migrations first.`)
  }
  console.log(`Applying ${LIBRARY_MIGRATION}…`)
  await client.query(fs.readFileSync(sqlPath, 'utf8'))
}

async function main(): Promise<void> {
  const replace = process.argv.includes('--replace')
  const total = catalogTrackCount()

  if (total === 0) {
    console.error('No tracks in CATALOG. Edit scripts/seed-tracks-catalog.ts and add your songs.')
    process.exit(1)
  }

  let connectionString = process.env.DATABASE_URL?.trim()?.replace(/^"+|"+$/g, '')
  if (!connectionString) {
    console.error('DATABASE_URL is not set in .env.local.')
    process.exit(1)
  }

  try {
    connectionString = decodeURIComponent(connectionString)
  } catch {
    // keep encoded form
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
  await client.connect()

  try {
    await ensureLibrarySchema(client)

    if (replace) {
      const del = await client.query(`DELETE FROM public.bingo_game_tracks WHERE game_id IS NULL`)
      console.log(`Cleared ${del.rowCount ?? 0} existing library row(s).`)
    }

    let inserted = 0
    let skipped = 0

    const byGenre = new Map<string, typeof TRACK_LIBRARY>()
    for (const track of TRACK_LIBRARY) {
      const list = byGenre.get(track.genre) ?? []
      list.push(track)
      byGenre.set(track.genre, list)
    }

    for (const [genre, tracks] of byGenre) {
      console.log(`Seeding ${genre} (${tracks.length} tracks)…`)

      for (const track of tracks) {
        const title = track.title?.trim()
        const artist = track.artist?.trim() || null
        if (!title) {
          console.warn(`  skip: missing title in ${genre}`)
          skipped += 1
          continue
        }

        const result = await client.query(
          `INSERT INTO public.bingo_game_tracks (title, artist, genre, game_id, played)
           SELECT $1, $2, $3, NULL, false
           WHERE NOT EXISTS (
             SELECT 1 FROM public.bingo_game_tracks
             WHERE game_id IS NULL
               AND lower(trim(title)) = lower(trim($1))
               AND lower(trim(coalesce(artist, ''))) = lower(trim(coalesce($2::text, '')))
           )
           RETURNING id`,
          [title, artist, genre]
        )

        if (result.rowCount && result.rowCount > 0) {
          inserted += 1
        } else {
          skipped += 1
        }
      }
    }

    await client.query(`NOTIFY pgrst, 'reload schema'`)

    const { rows: counts } = await client.query(
      `SELECT coalesce(genre, '(no genre)') AS genre, COUNT(*)::int AS n
       FROM public.bingo_game_tracks
       WHERE game_id IS NULL
       GROUP BY genre
       ORDER BY genre`
    )

    console.log('\nDone.')
    console.log(`  Inserted: ${inserted}`)
    console.log(`  Skipped (duplicate/empty): ${skipped}`)
    console.log('  Library by genre:')
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

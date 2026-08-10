#!/usr/bin/env node
/**
 * Ensures a LYRIC lobby exists in public.games (room_code + legacy code).
 * Creates a playlist from the first theme with 45+ songs when needed.
 * Requires DATABASE_URL in .env.local.
 */
const path = require('path')
const { Client } = require('pg')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const DEFAULT_ROOM_CODE = 'LYRIC'
const MIN_SONGS = 45

async function main() {
  let connectionString = process.env.DATABASE_URL?.trim()?.replace(/^"+|"+$/g, '')
  if (!connectionString) {
    console.error('DATABASE_URL is not set in .env.local.')
    process.exit(1)
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
  await client.connect()

  try {
    const existing = await client.query(
      `SELECT id, code, room_code, status, created_at
       FROM public.games
       WHERE room_code = $1 OR code = $1
       LIMIT 1`,
      [DEFAULT_ROOM_CODE]
    )

    if (existing.rows.length > 0) {
      const row = existing.rows[0]
      console.log('LYRIC lobby already active.')
      console.log(`  id: ${row.id}`)
      console.log(`  room_code: ${row.room_code ?? row.code}`)
      console.log(`  status: ${row.status}`)
      console.log(`  created_at: ${row.created_at}`)
      return
    }

    const { rows: countRows } = await client.query(`SELECT COUNT(*)::int AS n FROM public.games`)
    const gameCount = countRows[0]?.n ?? 0
    console.log(`No LYRIC lobby found (${gameCount} other game(s) in table). Seeding…`)

    const themeRes = await client.query(
      `SELECT t.id, t.name, COUNT(ts.id)::int AS song_count
       FROM public.themes t
       JOIN public.theme_songs ts ON ts.theme_id = t.id
       GROUP BY t.id, t.name
       HAVING COUNT(ts.id) >= $1
       ORDER BY COUNT(ts.id) DESC
       LIMIT 1`,
      [MIN_SONGS]
    )

    let playlistId

    if (themeRes.rows.length > 0) {
      const theme = themeRes.rows[0]
      console.log(`Using theme "${theme.name}" (${theme.song_count} songs)`)

      const playlistRes = await client.query(
        `INSERT INTO public.playlists (name) VALUES ($1) RETURNING id`,
        [`LyricGrid Lobby — ${theme.name}`]
      )
      playlistId = playlistRes.rows[0].id

      const songsRes = await client.query(
        `SELECT youtube_id, title FROM public.theme_songs WHERE theme_id = $1 ORDER BY position, id`,
        [theme.id]
      )

      let position = 0
      for (const s of songsRes.rows) {
        await client.query(
          `INSERT INTO public.playlist_songs (playlist_id, youtube_id, title, position, source)
           VALUES ($1, $2, $3, $4, 'youtube')`,
          [playlistId, s.youtube_id, s.title, position]
        )
        position += 1
      }
    } else {
      console.warn(`No theme with ${MIN_SONGS}+ songs — creating empty playlist (join may fail until songs are added).`)
      const playlistRes = await client.query(
        `INSERT INTO public.playlists (name) VALUES ($1) RETURNING id`,
        ['LyricGrid Default Lobby']
      )
      playlistId = playlistRes.rows[0].id
    }

    const gameRes = await client.query(
      `INSERT INTO public.games (playlist_id, code, room_code, status, grid_size, clip_seconds, crossfade_seconds, tier)
       VALUES ($1, $2, $2, 'lobby', 5, 20, 0, 'free')
       RETURNING id, code, room_code, status, created_at`,
      [playlistId, DEFAULT_ROOM_CODE]
    )

    const game = gameRes.rows[0]
    console.log('LYRIC lobby seeded successfully.')
    console.log(`  id: ${game.id}`)
    console.log(`  room_code: ${game.room_code ?? game.code}`)
    console.log(`  status: ${game.status}`)
    console.log(`  created_at: ${game.created_at}`)
    await client.query(`NOTIFY pgrst, 'reload schema'`)
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error('Seed failed:', e.message)
  process.exit(1)
})

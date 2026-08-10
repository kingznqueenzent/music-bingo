#!/usr/bin/env node
/** Inspect LYRIC lobby game playlist readiness for test play. */
const path = require('path')
const { Client } = require('pg')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  const game = await client.query(
    `SELECT g.id, g.code, g.room_code, g.status, g.playlist_id, g.theme_id
     FROM public.games g
     WHERE g.room_code = 'LYRIC' OR g.code = 'LYRIC'
     LIMIT 1`
  )
  if (!game.rows.length) {
    console.log('No LYRIC game found.')
    await client.end()
    return
  }
  const g = game.rows[0]
  const songs = await client.query(
    `SELECT COUNT(*)::int AS n,
            COUNT(*) FILTER (WHERE title IS NOT NULL AND trim(title) <> '')::int AS titled
     FROM public.playlist_songs WHERE playlist_id = $1`,
    [g.playlist_id]
  )
  const sample = await client.query(
    `SELECT id, youtube_id, title, position FROM public.playlist_songs
     WHERE playlist_id = $1 ORDER BY position LIMIT 5`,
    [g.playlist_id]
  )
  const tracks = await client.query(
    `SELECT COUNT(*)::int AS n FROM public.bingo_game_tracks WHERE game_id = $1`,
    [g.id]
  )
  console.log('LYRIC game:', g)
  console.log('playlist_songs:', songs.rows[0])
  console.log('bingo_game_tracks for game:', tracks.rows[0]?.n ?? 0)
  console.log('sample songs:', sample.rows)
  await client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') })
const { Client } = require('pg')

async function main() {
  let url = process.env.DATABASE_URL?.trim().replace(/^"+|"+$/g, '')
  if (!url) {
    console.error('DATABASE_URL missing')
    process.exit(1)
  }
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await client.connect()
  const { rows } = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'games','cards','card_cells','chat_messages','feature_flags',
        'playlist_songs','played_songs','players','bingo_game_tracks'
      )
    ORDER BY tablename
  `)
  console.log('Core tables present:', rows.map((r) => r.tablename).join(', ') || '(none)')
  const badges = await client.query(
    `SELECT id, condition_type FROM public.badge_definitions ORDER BY id LIMIT 20`
  )
  console.log('Badge rows:', badges.rows.length)
  await client.end()
}

main().catch((e) => {
  console.error('DB error:', e.message)
  process.exit(1)
})

#!/usr/bin/env node
/**
 * Count catalog rows in bingo_game_tracks (game_id IS NULL).
 * Usage: node scripts/count-library-tracks.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') })
const { Client } = require('pg')
const { createClient } = require('@supabase/supabase-js')

async function viaPg() {
  let url = process.env.DATABASE_URL?.trim().replace(/^"+|"+$/g, '')
  if (!url) return null
  try {
    url = decodeURIComponent(url)
  } catch {
    // keep
  }
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await client.connect()
  const { rows } = await client.query(`
    SELECT coalesce(genre, '(no genre)') AS genre, COUNT(*)::int AS n
    FROM public.bingo_game_tracks WHERE game_id IS NULL
    GROUP BY genre ORDER BY n DESC, genre
  `)
  const { rows: total } = await client.query(
    `SELECT COUNT(*)::int AS n FROM public.bingo_game_tracks WHERE game_id IS NULL`
  )
  await client.end()
  return { total: total[0]?.n ?? 0, byGenre: rows }
}

async function viaRest() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) return null
  const supabase = createClient(url, key)
  const { data, error } = await supabase.from('bingo_game_tracks').select('genre').is('game_id', null)
  if (error) throw new Error(error.message)
  const byGenre = new Map()
  for (const row of data ?? []) {
    const g = row.genre?.trim() || '(no genre)'
    byGenre.set(g, (byGenre.get(g) ?? 0) + 1)
  }
  return {
    total: data?.length ?? 0,
    byGenre: [...byGenre.entries()]
      .map(([genre, n]) => ({ genre, n }))
      .sort((a, b) => b.n - a.n),
  }
}

async function main() {
  console.log('Library track count (bingo_game_tracks WHERE game_id IS NULL)')
  try {
    const pg = await viaPg()
    if (pg) {
      console.log('Source: Postgres')
      console.log('Total:', pg.total)
      for (const row of pg.byGenre) console.log(`  ${row.genre}: ${row.n}`)
      return
    }
  } catch (e) {
    console.warn('Postgres:', e.message)
  }
  try {
    const rest = await viaRest()
    if (rest) {
      console.log('Source: Supabase REST')
      console.log('Total:', rest.total)
      for (const row of rest.byGenre) console.log(`  ${row.genre}: ${row.n}`)
      return
    }
  } catch (e) {
    console.warn('REST:', e.message)
  }
  console.error('Could not reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL / DATABASE_URL.')
  process.exit(1)
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})

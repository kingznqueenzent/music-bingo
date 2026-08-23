/**
 * Verify public.songs.genre exists; apply migration SQL if missing.
 * Usage: node scripts/verify-songs-genre.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = resolve(root, '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (!m) continue
    const key = m[1].trim()
    if (!process.env[key]) process.env[key] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

const url = process.env.DATABASE_URL
if (!url) {
  console.log('SCHEMA_STATUS: skipped (no DATABASE_URL)')
  process.exit(0)
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
await client.connect()

const check = await client.query(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'songs' AND column_name = 'genre'
`)

if (check.rows.length > 0) {
  console.log(`SCHEMA_STATUS: songs.genre exists (${check.rows[0].data_type})`)
  await client.end()
  process.exit(0)
}

console.log('SCHEMA_STATUS: songs.genre missing — applying migration…')
const sql = readFileSync(
  resolve(root, 'supabase/migrations/20260816200000_songs_genre.sql'),
  'utf8'
)
await client.query(sql)
const again = await client.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'songs' AND column_name = 'genre'
`)
await client.end()
if (again.rows.length === 0) {
  console.error('SCHEMA_STATUS: migration ran but column still missing')
  process.exit(1)
}
console.log('SCHEMA_STATUS: songs.genre applied successfully')

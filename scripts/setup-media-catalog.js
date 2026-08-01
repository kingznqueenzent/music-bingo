#!/usr/bin/env node
/**
 * Media catalog setup: verify DB connection, seed decade themes, clean songs.
 *
 * Usage: npm run db:setup-media-catalog
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), override: true })

const fs = require('fs')
const path = require('path')
const { connectPg } = require('./lib/pg-connect')

async function runSqlFile(client, relativePath) {
  const sqlPath = path.join(__dirname, '..', relativePath)
  if (!fs.existsSync(sqlPath)) throw new Error(`Missing SQL file: ${relativePath}`)
  console.log(`Applying ${relativePath}…`)
  await client.query(fs.readFileSync(sqlPath, 'utf8'))
}

async function main() {
  const raw = process.env.DATABASE_URL
  if (!raw) {
    console.error('DATABASE_URL is not set in .env.local')
    process.exit(1)
  }

  console.log('LyricGrid — Media catalog setup')
  console.log('================================\n')

  const { client, label } = await connectPg(raw)
  console.log(`Connected via ${label}\n`)

  try {
    await runSqlFile(client, 'supabase/migrations/20260730180000_decade_themes_seed.sql')

    const deleted = await client.query(`
      DELETE FROM public.songs
      WHERE theme_id IS NULL
         OR lower(trim(coalesce(artist, ''))) = 'unknown artist'
         OR title LIKE '%·%'
         OR title ~ '^[A-Za-z0-9_-]{11}\\s*·'
    `)
    console.log('Deleted junk song rows:', deleted.rowCount)

    await client.query(`NOTIFY pgrst, 'reload schema'`)

    const stats = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM public.themes WHERE category = 'decade-genre') AS decade_themes,
        (SELECT COUNT(*)::int FROM public.songs) AS total_songs,
        (SELECT COUNT(*)::int FROM public.songs WHERE theme_id IS NULL) AS null_theme,
        (SELECT COUNT(*)::int FROM public.songs WHERE title LIKE '%·%') AS dot_titles
    `)
    console.log('\nCatalog stats:', stats.rows[0])
  } finally {
    await client.end()
  }

  console.log('\nRunning song reassignment cleanup…')
  const { spawnSync } = require('child_process')
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'db:cleanup-songs'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true,
  })
  if (result.status !== 0) process.exit(result.status ?? 1)

  console.log('\n✓ Media catalog setup complete')
}

main().catch((e) => {
  console.error('\nSetup failed:', e.message)
  process.exit(1)
})

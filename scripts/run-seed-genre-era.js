#!/usr/bin/env node
/**
 * Run supabase/seed-genre-era-hierarchy.sql (genres, eras, theme sub-genres 1950s–2026).
 * Requires: RUN-FULL-SETUP.sql (or schema-genre-era.sql) applied first.
 * Run: node scripts/run-seed-genre-era.js
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

async function main() {
  let connectionString = process.env.DATABASE_URL
  if (!connectionString || !connectionString.trim()) {
    console.error('DATABASE_URL not set in .env.local.')
    process.exit(1)
  }
  connectionString = connectionString.trim().replace(/^"+|"+$/g, '')

  const sqlPath = path.join(__dirname, '..', 'supabase', 'seed-genre-era-hierarchy.sql')
  if (!fs.existsSync(sqlPath)) {
    console.error('Not found: supabase/seed-genre-era-hierarchy.sql')
    process.exit(1)
  }
  const sql = fs.readFileSync(sqlPath, 'utf8')

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    console.log('Running seed-genre-era-hierarchy.sql...')
    await client.query(sql)
    console.log('Done. Genres, eras, and theme sub-genres (1950s–2026) seeded.')
  } catch (e) {
    console.error('Error:', e.message)
    if (e.message && e.message.includes('password authentication failed')) {
      console.error('Run supabase/seed-genre-era-hierarchy.sql in Supabase SQL Editor instead.')
    }
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()

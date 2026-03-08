#!/usr/bin/env node
/**
 * One-off: run theme_songs INSERT policy SQL against the database from .env.local.
 * Usage: node scripts/run-theme-songs-insert-policy.js
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

function getDatabaseUrl() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) return null
  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    if (line.startsWith('DATABASE_URL=')) {
      let val = line.slice('DATABASE_URL='.length).trim()
      while (val.startsWith('"')) val = val.slice(1)
      while (val.endsWith('"')) val = val.slice(0, -1)
      while (val.startsWith("'")) val = val.slice(1)
      while (val.endsWith("'")) val = val.slice(0, -1)
      return val.replace(/\\\$/g, '$')
    }
  }
  return null
}

const SQL = [
  'drop policy if exists "Allow insert theme_songs" on public.theme_songs',
  'create policy "Allow insert theme_songs" on public.theme_songs for insert with check (true)',
  "notify pgrst, 'reload schema'",
]

async function main() {
  const databaseUrl = getDatabaseUrl() || process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL not set in .env.local')
    process.exit(1)
  }
  const client = new Client({ connectionString: databaseUrl })
  try {
    await client.connect()
    for (const q of SQL) {
      await client.query(q)
    }
    console.log('Done. theme_songs INSERT policy is in place.')
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()

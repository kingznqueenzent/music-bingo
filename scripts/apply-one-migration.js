#!/usr/bin/env node
/** Apply a single migration file by name (uses DATABASE_URL from .env.local). */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/apply-one-migration.js <filename.sql>')
  process.exit(1)
}

async function main() {
  const connectionString = process.env.DATABASE_URL?.trim()?.replace(/^"+|"+$/g, '')
  if (!connectionString) {
    console.error('DATABASE_URL is not set in .env.local.')
    process.exit(1)
  }
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', file)
  if (!fs.existsSync(sqlPath)) {
    console.error('Not found:', sqlPath)
    process.exit(1)
  }
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
  try {
    await client.connect()
    console.log('Applying', file, '…')
    await client.query(fs.readFileSync(sqlPath, 'utf8'))
    await client.query(`NOTIFY pgrst, 'reload schema'`)
    console.log('Done.')
  } catch (e) {
    console.error('Error:', e.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()

#!/usr/bin/env node
/**
 * Run Supabase schema + grants against the database using DATABASE_URL from .env.local.
 * Run: node scripts/run-supabase-schema.js
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

// Load .env.local so DATABASE_URL is parsed correctly (e.g. password with $)
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

async function main() {
  let connectionString = process.env.DATABASE_URL
  if (!connectionString || !connectionString.trim()) {
    console.error('DATABASE_URL not set in .env.local.')
    process.exit(1)
  }
  connectionString = connectionString.trim()

  const fullSetupPath = path.join(__dirname, '..', 'supabase', 'RUN-FULL-SETUP.sql')
  if (!fs.existsSync(fullSetupPath)) {
    console.error('Not found: supabase/RUN-FULL-SETUP.sql')
    process.exit(1)
  }
  const sql = fs.readFileSync(fullSetupPath, 'utf8')

  const client = new Client({
    connectionString: connectionString.replace(/^"+|"+$/g, ''),
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    console.log('Running RUN-FULL-SETUP.sql...')
    await client.query(sql)
    console.log('Done. Supabase schema and API grants applied.')
  } catch (e) {
    if (e.message && e.message.includes('password authentication failed')) {
      console.error('Error: Database password not accepted. Use Supabase SQL Editor instead:')
      console.error('  1. Open https://supabase.com/dashboard/project/dmcjpkrdivafkqoovyvn/sql/new')
      console.error('  2. Paste the contents of supabase/RUN-FULL-SETUP.sql')
      console.error('  3. Click Run.')
    } else {
      console.error('Error:', e.message)
    }
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()

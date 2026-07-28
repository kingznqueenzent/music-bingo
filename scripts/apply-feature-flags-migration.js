#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

async function main() {
  let connectionString = process.env.DATABASE_URL
  if (!connectionString?.trim()) {
    console.error('DATABASE_URL is not set in .env.local.')
    process.exit(1)
  }
  connectionString = connectionString.trim().replace(/^"+|"+$/g, '')

  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260422120000_feature_flags.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    await client.query(sql)
    await client.query(`NOTIFY pgrst, 'reload schema'`)
    console.log('feature_flags migration applied.')
  } catch (e) {
    console.error('Error:', e.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()

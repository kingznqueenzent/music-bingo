#!/usr/bin/env node
const path = require('path')
const { Client } = require('pg')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  const one = async (sql) => (await client.query(sql)).rows[0]
  console.log('total', (await one('select count(*)::int as n from theme_songs')).n)
  console.log('distinct youtube_id', (await one('select count(distinct youtube_id)::int as n from theme_songs')).n)
  console.log(
    'null/empty title',
    (await one("select count(*)::int as n from theme_songs where title is null or trim(title)=''")).n
  )
  console.log(
    'distinct (theme_id, youtube_id)',
    (await one('select count(distinct (theme_id, youtube_id))::int as n from theme_songs')).n
  )
  const dup = await client.query(`
    select theme_id, youtube_id, count(*)::int as c
    from theme_songs
    group by theme_id, youtube_id
    having count(*) > 1
    order by c desc
    limit 5
  `)
  console.log('dup within same theme:', dup.rows)
  const dupPos = await client.query(`
    select theme_id, youtube_id, position, count(*)::int as c
    from theme_songs
    group by theme_id, youtube_id, position
    having count(*) > 1
    order by c desc
    limit 5
  `)
  console.log('dup same theme+youtube+position:', dupPos.rows)
  const themes = await client.query(`
    select t.name, count(ts.*)::int as songs
    from themes t
    join theme_songs ts on ts.theme_id = t.id
    group by t.id, t.name
    order by songs desc
    limit 10
  `)
  console.log('themes by song count:', themes.rows)
  await client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

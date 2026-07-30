require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') })
const { createClient } = require('@supabase/supabase-js')

;(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or ANON_KEY')
    process.exit(1)
  }
  const supabase = createClient(url, key)
  const { data: themes, error: themesErr } = await supabase.from('themes').select('id,name').limit(5)
  if (themesErr) {
    console.error('themes error:', themesErr.message)
    process.exit(1)
  }
  console.log('themes loaded:', themes?.length ?? 0, themes?.map((t) => t.name).join(', '))
  const { data: songs, error: songsErr } = await supabase
    .from('theme_songs')
    .select('id,title,theme_tag')
    .limit(3)
  if (songsErr) {
    console.error('theme_songs error:', songsErr.message)
    process.exit(1)
  }
  console.log('theme_songs sample:', songs?.length ?? 0)
  console.log('Supabase REST theme loading: OK')
})()

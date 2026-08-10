import type { SupabaseClient } from '@supabase/supabase-js'

/** Fetch YouTube video titles via noembed (no API key) and update playlist_songs rows. */
export async function fillYoutubeTitles(
  supabase: SupabaseClient,
  rows: { id: string; youtube_id: string }[]
) {
  const BATCH = 8
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const results = await Promise.all(
      batch.map(async (row) => {
        try {
          const res = await fetch(
            `https://noembed.com/embed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${row.youtube_id}`)}`,
            { signal: AbortSignal.timeout(5000) }
          )
          const data = (await res.json()) as { title?: string }
          return { id: row.id, title: data?.title ?? null }
        } catch {
          return { id: row.id, title: null }
        }
      })
    )
    for (const { id, title } of results) {
      if (title) await supabase.from('playlist_songs').update({ title }).eq('id', id)
    }
  }
}

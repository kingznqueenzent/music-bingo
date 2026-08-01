-- Remove junk rows from public.songs and align assignments to decade-genre themes.
-- Prefer: npx tsx scripts/cleanup-songs-catalog.ts (also reassigns legacy themes).

DELETE FROM public.songs
WHERE theme_id IS NULL
   OR lower(trim(coalesce(artist, ''))) = 'unknown artist'
   OR title LIKE '%·%'
   OR title ~ '^[A-Za-z0-9_-]{11}\s*·';

NOTIFY pgrst, 'reload schema';

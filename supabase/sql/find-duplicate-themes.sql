-- Find duplicate themes by normalized name (run in Supabase SQL Editor).
-- Review rows before deleting; merge theme_songs / games.theme_id / media_library.theme_id onto one id first.

SELECT
  lower(trim(name)) AS name_key,
  count(*)::int AS cnt,
  array_agg(id ORDER BY created_at NULLS FIRST, id) AS theme_ids,
  array_agg(name ORDER BY created_at NULLS FIRST, id) AS names
FROM public.themes
GROUP BY lower(trim(name))
HAVING count(*) > 1
ORDER BY lower(trim(name));

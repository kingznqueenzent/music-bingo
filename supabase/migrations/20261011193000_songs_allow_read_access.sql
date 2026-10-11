-- Exact Media Manager SELECT policy. Hosts often hit PostgREST as `anon`
-- (admin cookie, no Supabase Auth session). Missing SELECT → data = [].
-- Keep songs_select_all as an equivalent named policy.

ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to songs" ON public.songs;
CREATE POLICY "Allow read access to songs" ON public.songs
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "songs_select_all" ON public.songs;
CREATE POLICY "songs_select_all" ON public.songs
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.songs TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

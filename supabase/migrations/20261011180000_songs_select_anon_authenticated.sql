-- Media Manager lists public.songs from the browser (publishable/anon key).
-- Hosts often have only the admin cookie — no Supabase Auth session — so the
-- PostgREST role is `anon`. RLS with no matching SELECT policy returns [].
-- Re-assert open catalog reads for anon + authenticated. Service role still
-- bypasses RLS for /api/songs.

ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "songs_select_all" ON public.songs;
CREATE POLICY "songs_select_all" ON public.songs
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.songs TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- Allow authenticated hosts to delete catalog rows from Media Manager UI.

DROP POLICY IF EXISTS "songs_delete_authenticated" ON public.songs;
CREATE POLICY "songs_delete_authenticated" ON public.songs
  FOR DELETE TO authenticated USING (true);

NOTIFY pgrst, 'reload schema';

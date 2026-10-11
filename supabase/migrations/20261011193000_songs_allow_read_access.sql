-- Enable RLS so missing SELECT policies cannot silently return [].
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

-- Enable RLS read policy on songs table
DROP POLICY IF EXISTS "Allow read access to songs" ON public.songs;
CREATE POLICY "Allow read access to songs"
ON public.songs
FOR SELECT
USING (true);

-- Equivalent named policy for anon + authenticated (Media Manager client reads).
DROP POLICY IF EXISTS "songs_select_all" ON public.songs;
CREATE POLICY "songs_select_all" ON public.songs
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.songs TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

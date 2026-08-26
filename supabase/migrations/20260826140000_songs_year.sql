-- Ensure catalog year is present and indexed for Media Manager inline/bulk edits.
ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS year int;

COMMENT ON COLUMN public.songs.year IS
  'Release year (1900–2100). Nullable when unknown.';

CREATE INDEX IF NOT EXISTS idx_songs_year ON public.songs (year);

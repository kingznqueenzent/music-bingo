-- Catalog genre tags for Media Library smart organization / auto-tagging.
-- Safe / idempotent: adds public.songs.genre + index when missing.

ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS genre text;

COMMENT ON COLUMN public.songs.genre IS
  'Library genre tag: Reggae | Dancehall | Afrobeats | Hip-Hop | R&B | Other (nullable = uncategorized).';

CREATE INDEX IF NOT EXISTS idx_songs_genre ON public.songs (genre);

NOTIFY pgrst, 'reload schema';

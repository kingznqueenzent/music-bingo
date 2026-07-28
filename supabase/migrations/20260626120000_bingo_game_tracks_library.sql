-- Media library catalog on bingo_game_tracks (game_id NULL = host catalog, not per-game pool).
-- Preserves Base44 title / artist / genre workflow alongside Choice A game tracks.

ALTER TABLE public.bingo_game_tracks
  ALTER COLUMN game_id DROP NOT NULL;

ALTER TABLE public.bingo_game_tracks
  ADD COLUMN IF NOT EXISTS genre text,
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS file_path text,
  ADD COLUMN IF NOT EXISTS theme_id uuid REFERENCES public.themes (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_bingo_game_tracks_library
  ON public.bingo_game_tracks (created_at DESC)
  WHERE game_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_bingo_game_tracks_library_genre
  ON public.bingo_game_tracks (genre)
  WHERE game_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bingo_game_tracks_library_dedupe
  ON public.bingo_game_tracks (
    lower(trim(title)),
    lower(trim(coalesce(artist, '')))
  )
  WHERE game_id IS NULL;

COMMENT ON COLUMN public.bingo_game_tracks.genre IS
  'Host catalog genre bucket (e.g. Dancehall, Reggae, 80''s Pop). NULL for per-game copies.';
COMMENT ON COLUMN public.bingo_game_tracks.game_id IS
  'NULL = shared media catalog row; non-null = track pool for that game (Choice A).';

NOTIFY pgrst, 'reload schema';

-- Choice A foundation ON EXISTING LyricGrid (playlist_songs / card_cells / DJ `tracks` catalog).
-- Adds: players, bingo_game_tracks (Choice A per-game tracks), host_id + card extensions.
-- Does NOT drop or replace legacy tables.

-- ---------------------------------------------------------------------------
-- games: host_id (room_code = existing `code` column)
-- ---------------------------------------------------------------------------
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS host_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_games_host_id ON public.games (host_id) WHERE host_id IS NOT NULL;

COMMENT ON COLUMN public.games.code IS 'Room code shown to players (Choice A room_code equivalent)';
COMMENT ON COLUMN public.games.host_id IS 'Supabase Auth user id of the DJ/host';

-- ---------------------------------------------------------------------------
-- players (Choice A)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games (id) ON DELETE CASCADE,
  username text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT players_game_username_unique UNIQUE (game_id, username)
);

CREATE INDEX IF NOT EXISTS idx_players_game_id ON public.players (game_id);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "players_select_all" ON public.players;
CREATE POLICY "players_select_all" ON public.players FOR SELECT USING (true);
DROP POLICY IF EXISTS "players_insert_all" ON public.players;
CREATE POLICY "players_insert_all" ON public.players FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "players_update_all" ON public.players;
CREATE POLICY "players_update_all" ON public.players FOR UPDATE USING (true);

GRANT SELECT, INSERT, UPDATE ON public.players TO anon, authenticated;
GRANT ALL ON public.players TO service_role;

-- ---------------------------------------------------------------------------
-- bingo_game_tracks — Choice A `tracks` (avoids DJ mix analyzer public.tracks)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bingo_game_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games (id) ON DELETE CASCADE,
  title text NOT NULL,
  artist text,
  played boolean NOT NULL DEFAULT false,
  played_at timestamptz,
  CONSTRAINT bingo_game_tracks_played_at CHECK (
    (played = false AND played_at IS NULL) OR (played = true)
  )
);

CREATE INDEX IF NOT EXISTS idx_bingo_game_tracks_game ON public.bingo_game_tracks (game_id);
CREATE INDEX IF NOT EXISTS idx_bingo_game_tracks_game_played ON public.bingo_game_tracks (game_id, played);

COMMENT ON TABLE public.bingo_game_tracks IS 'Choice A per-game track pool; use instead of public.tracks (DJ catalog)';

ALTER TABLE public.bingo_game_tracks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bingo_game_tracks_select" ON public.bingo_game_tracks;
CREATE POLICY "bingo_game_tracks_select" ON public.bingo_game_tracks FOR SELECT USING (true);
DROP POLICY IF EXISTS "bingo_game_tracks_insert" ON public.bingo_game_tracks;
CREATE POLICY "bingo_game_tracks_insert" ON public.bingo_game_tracks FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "bingo_game_tracks_update" ON public.bingo_game_tracks;
CREATE POLICY "bingo_game_tracks_update" ON public.bingo_game_tracks FOR UPDATE USING (true);

GRANT SELECT, INSERT, UPDATE ON public.bingo_game_tracks TO anon, authenticated;
GRANT ALL ON public.bingo_game_tracks TO service_role;

-- ---------------------------------------------------------------------------
-- cards: Choice A columns (legacy player_name / card_cells remain in use)
-- ---------------------------------------------------------------------------
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS player_id uuid REFERENCES public.players (id) ON DELETE SET NULL;

ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS grid_data jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS won boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_cards_player_id ON public.cards (player_id) WHERE player_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cards_grid_data ON public.cards USING gin (grid_data jsonb_path_ops);

COMMENT ON COLUMN public.cards.grid_data IS
  'Choice A JSON grid: [{ position, track_id, title?, artist? }] — optional alongside card_cells';
COMMENT ON COLUMN public.cards.won IS 'Choice A: card has a verified bingo win';

-- Realtime
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.players';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.bingo_game_tracks';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- LyricGrid — Choice A: Core database foundation (greenfield / empty Supabase)
-- =============================================================================
-- Run this ENTIRE file in Supabase Dashboard → SQL Editor → New query → Run.
--
-- Creates: games, tracks (per-game bingo songs), players, cards (jsonb grid).
-- Requires: empty project OR no conflicting tables named games/tracks/players/cards.
--
-- If you ALREADY have LyricGrid migrations applied (playlist_songs, card_cells, DJ
-- catalog `tracks`), do NOT run this file — use instead:
--   supabase/migrations/20260428120000_choice_a_lyricgrid_bridge.sql
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- games
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code text NOT NULL UNIQUE,
  host_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'lobby'
    CHECK (status IN ('lobby', 'playing', 'ended')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_games_room_code ON public.games (room_code);
CREATE INDEX IF NOT EXISTS idx_games_status ON public.games (status);
CREATE INDEX IF NOT EXISTS idx_games_host_id ON public.games (host_id) WHERE host_id IS NOT NULL;

COMMENT ON TABLE public.games IS 'Active bingo session; room_code is what players enter at /join';
COMMENT ON COLUMN public.games.host_id IS 'Supabase Auth user id of the DJ/host (nullable for demo)';

-- ---------------------------------------------------------------------------
-- players
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games (id) ON DELETE CASCADE,
  username text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT players_game_username_unique UNIQUE (game_id, username)
);

CREATE INDEX IF NOT EXISTS idx_players_game_id ON public.players (game_id);

COMMENT ON TABLE public.players IS 'One row per player who joined a game session';

-- ---------------------------------------------------------------------------
-- tracks (per-game bingo song pool — NOT the DJ mix analyzer catalog)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games (id) ON DELETE CASCADE,
  title text NOT NULL,
  artist text,
  played boolean NOT NULL DEFAULT false,
  played_at timestamptz,
  CONSTRAINT tracks_played_at_when_played CHECK (
    (played = false AND played_at IS NULL) OR (played = true)
  )
);

CREATE INDEX IF NOT EXISTS idx_tracks_game_id ON public.tracks (game_id);
CREATE INDEX IF NOT EXISTS idx_tracks_game_played ON public.tracks (game_id, played);

COMMENT ON TABLE public.tracks IS 'Songs in the bingo pool for one game; host marks played=true when called';

-- ---------------------------------------------------------------------------
-- cards
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES public.games (id) ON DELETE CASCADE,
  grid_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  won boolean NOT NULL DEFAULT false,
  CONSTRAINT cards_player_game_unique UNIQUE (player_id, game_id),
  CONSTRAINT cards_grid_is_array CHECK (jsonb_typeof(grid_data) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_cards_game_id ON public.cards (game_id);
CREATE INDEX IF NOT EXISTS idx_cards_player_id ON public.cards (player_id);
CREATE INDEX IF NOT EXISTS idx_cards_grid_data ON public.cards USING gin (grid_data jsonb_path_ops);

COMMENT ON TABLE public.cards IS 'One bingo card per player; grid_data is 25 cells (5×5) of track ids + metadata';
COMMENT ON COLUMN public.cards.grid_data IS
  'JSON array of { "position": 0-24, "track_id": "uuid", "title"?: string, "artist"?: string }';

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "games_select_all" ON public.games;
CREATE POLICY "games_select_all" ON public.games FOR SELECT USING (true);

DROP POLICY IF EXISTS "games_insert_all" ON public.games;
CREATE POLICY "games_insert_all" ON public.games FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "games_update_all" ON public.games;
CREATE POLICY "games_update_all" ON public.games FOR UPDATE USING (true);

DROP POLICY IF EXISTS "players_select_all" ON public.players;
CREATE POLICY "players_select_all" ON public.players FOR SELECT USING (true);

DROP POLICY IF EXISTS "players_insert_all" ON public.players;
CREATE POLICY "players_insert_all" ON public.players FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "tracks_select_all" ON public.tracks;
CREATE POLICY "tracks_select_all" ON public.tracks FOR SELECT USING (true);

DROP POLICY IF EXISTS "tracks_insert_all" ON public.tracks;
CREATE POLICY "tracks_insert_all" ON public.tracks FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "tracks_update_all" ON public.tracks;
CREATE POLICY "tracks_update_all" ON public.tracks FOR UPDATE USING (true);

DROP POLICY IF EXISTS "cards_select_all" ON public.cards;
CREATE POLICY "cards_select_all" ON public.cards FOR SELECT USING (true);

DROP POLICY IF EXISTS "cards_insert_all" ON public.cards;
CREATE POLICY "cards_insert_all" ON public.cards FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "cards_update_all" ON public.cards;
CREATE POLICY "cards_update_all" ON public.cards FOR UPDATE USING (true);

-- ---------------------------------------------------------------------------
-- Grants (anon + authenticated clients; service role bypasses RLS)
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON public.games TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.players TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tracks TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.cards TO anon, authenticated;

GRANT ALL ON public.games TO service_role;
GRANT ALL ON public.players TO service_role;
GRANT ALL ON public.tracks TO service_role;
GRANT ALL ON public.cards TO service_role;

-- ---------------------------------------------------------------------------
-- Realtime (enable replication for live host ↔ player sync)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.games';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.players';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.tracks';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.cards';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

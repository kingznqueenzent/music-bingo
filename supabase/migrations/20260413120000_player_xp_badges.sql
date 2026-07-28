-- LyricGrid: XP, streaks, badges on leaderboard (player profile aggregate)
-- + session tracking to avoid double-awarding play vs win claims

ALTER TABLE public.leaderboard
  ADD COLUMN IF NOT EXISTS total_xp int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS games_played int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_current int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_best int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_played_week text,
  ADD COLUMN IF NOT EXISTS badges text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.leaderboard.total_xp IS 'Lifetime XP; points column kept in sync for legacy leaderboard views';
COMMENT ON COLUMN public.leaderboard.last_played_week IS 'ISO week string e.g. 2026-W15';

CREATE TABLE IF NOT EXISTS public.badge_definitions (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon_url text,
  condition_type text NOT NULL CHECK (condition_type IN ('games_played', 'wins', 'streak', 'level')),
  condition_value int NOT NULL
);

INSERT INTO public.badge_definitions (id, name, description, icon_url, condition_type, condition_value) VALUES
  ('first_timer', 'First Timer', 'Play your first game', NULL, 'games_played', 1),
  ('on_fire', 'On Fire', '3 week streak', NULL, 'streak', 3),
  ('dedicated', 'Dedicated', '5 week streak', NULL, 'streak', 5),
  ('unbreakable', 'Unbreakable', '10 week streak', NULL, 'streak', 10),
  ('first_win', 'Winner', 'First win', NULL, 'wins', 1),
  ('hat_trick', 'Hat Trick', '3 wins total', NULL, 'wins', 3),
  ('sharp_shooter', 'Sharp Shooter', '10 wins total', NULL, 'wins', 10),
  ('lyric_legend', 'Legend', 'Reach Level 5', NULL, 'level', 5)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  condition_type = EXCLUDED.condition_type,
  condition_value = EXCLUDED.condition_value;

CREATE TABLE IF NOT EXISTS public.player_game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  identifier text NOT NULL,
  participation_awarded boolean NOT NULL DEFAULT false,
  win_awarded boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (game_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_player_game_sessions_identifier ON public.player_game_sessions(identifier);

ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read badge_definitions" ON public.badge_definitions;
CREATE POLICY "Allow read badge_definitions" ON public.badge_definitions FOR SELECT USING (true);

ALTER TABLE public.player_game_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read player_game_sessions" ON public.player_game_sessions;
CREATE POLICY "Allow read player_game_sessions" ON public.player_game_sessions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert player_game_sessions" ON public.player_game_sessions;
CREATE POLICY "Allow insert player_game_sessions" ON public.player_game_sessions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update player_game_sessions" ON public.player_game_sessions;
CREATE POLICY "Allow update player_game_sessions" ON public.player_game_sessions FOR UPDATE USING (true);

GRANT SELECT ON public.badge_definitions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.player_game_sessions TO anon, authenticated;

-- Seasonal tournaments + entries + per-game dedupe + tournament badge definitions

CREATE TABLE IF NOT EXISTS public.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL CHECK (status IN ('upcoming', 'active', 'completed')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  theme_ids uuid[] NOT NULL DEFAULT '{}',
  format text NOT NULL DEFAULT 'points' CHECK (format IN ('points', 'bracket')),
  rounds_total int NOT NULL DEFAULT 1 CHECK (rounds_total >= 1),
  prize_description text,
  banner_url text,
  max_players int CHECK (max_players IS NULL OR max_players > 0),
  winner_bonus_xp int NOT NULL DEFAULT 200,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournaments_status_dates ON public.tournaments(status, start_date, end_date);

CREATE TABLE IF NOT EXISTS public.tournament_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player_email text NOT NULL,
  player_name text NOT NULL,
  player_identifier text NOT NULL,
  points int NOT NULL DEFAULT 0,
  rounds_played int NOT NULL DEFAULT 0,
  rank int,
  is_eliminated boolean NOT NULL DEFAULT false,
  attendance_bonus_applied boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (tournament_id, player_identifier)
);

CREATE UNIQUE INDEX IF NOT EXISTS tournament_entries_email_lower
  ON public.tournament_entries(tournament_id, lower(player_email));

CREATE INDEX IF NOT EXISTS idx_tournament_entries_tournament_points ON public.tournament_entries(tournament_id, points DESC);

CREATE TABLE IF NOT EXISTS public.tournament_game_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES public.tournament_entries(id) ON DELETE CASCADE,
  participation_applied boolean NOT NULL DEFAULT false,
  win_applied boolean NOT NULL DEFAULT false,
  fastest_applied boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (tournament_id, game_id, entry_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_game_events_game ON public.tournament_game_events(game_id);

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read tournaments" ON public.tournaments;
CREATE POLICY "Allow read tournaments" ON public.tournaments FOR SELECT USING (true);

ALTER TABLE public.tournament_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read tournament_entries" ON public.tournament_entries;
CREATE POLICY "Allow read tournament_entries" ON public.tournament_entries FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert tournament_entries" ON public.tournament_entries;
CREATE POLICY "Allow insert tournament_entries" ON public.tournament_entries FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update tournament_entries" ON public.tournament_entries;
CREATE POLICY "Allow update tournament_entries" ON public.tournament_entries FOR UPDATE USING (true);

ALTER TABLE public.tournament_game_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read tournament_game_events" ON public.tournament_game_events;
CREATE POLICY "Allow read tournament_game_events" ON public.tournament_game_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert tournament_game_events" ON public.tournament_game_events;
CREATE POLICY "Allow insert tournament_game_events" ON public.tournament_game_events FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update tournament_game_events" ON public.tournament_game_events;
CREATE POLICY "Allow update tournament_game_events" ON public.tournament_game_events FOR UPDATE USING (true);

GRANT SELECT ON public.tournaments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tournament_entries TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tournament_game_events TO anon, authenticated;

-- Tournament badges (extend condition_type check)
ALTER TABLE public.badge_definitions DROP CONSTRAINT IF EXISTS badge_definitions_condition_type_check;
ALTER TABLE public.badge_definitions ADD CONSTRAINT badge_definitions_condition_type_check
  CHECK (condition_type IN (
    'games_played', 'wins', 'streak', 'level', 'tournaments_entered',
    'chat_messages_sent', 'chat_distinct_days'
  ));

INSERT INTO public.badge_definitions (id, name, description, icon_url, condition_type, condition_value) VALUES
  ('tournament_veteran', 'Series Veteran', 'Enter 3 or more tournaments', NULL, 'tournaments_entered', 3)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  condition_type = EXCLUDED.condition_type,
  condition_value = EXCLUDED.condition_value;

COMMENT ON TABLE public.tournaments IS 'Seasonal LyricGrid tournaments; theme_ids empty = all themes eligible';
COMMENT ON COLUMN public.tournament_game_events.participation_applied IS 'Played round (+10) applied for this game';

NOTIFY pgrst, 'reload schema';

-- Live in-game scoring for Music Bingo (per card / session)
-- Score: +1 correct tap, -1 wrong tap (floor 0), +10 verified bingo

CREATE TABLE IF NOT EXISTS public.game_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  player_name text NOT NULL DEFAULT 'Player',
  player_identifier text,
  score int NOT NULL DEFAULT 0 CHECK (score >= 0),
  correct_taps int NOT NULL DEFAULT 0 CHECK (correct_taps >= 0),
  wrong_taps int NOT NULL DEFAULT 0 CHECK (wrong_taps >= 0),
  streak_current int NOT NULL DEFAULT 0 CHECK (streak_current >= 0),
  streak_best int NOT NULL DEFAULT 0 CHECK (streak_best >= 0),
  bingo_bonus_awarded boolean NOT NULL DEFAULT false,
  bingo_completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_game_players_game_score
  ON public.game_players (game_id, score DESC, bingo_completed_at ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_game_players_card ON public.game_players (card_id);

COMMENT ON TABLE public.game_players IS 'Per-game live scores: taps, accuracy inputs, bingo bonus timestamp';
COMMENT ON COLUMN public.game_players.score IS 'Running points; never below 0';
COMMENT ON COLUMN public.game_players.bingo_completed_at IS 'When verified bingo bonus was awarded (sort by speed)';

ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read game_players" ON public.game_players;
CREATE POLICY "Allow read game_players" ON public.game_players FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert game_players" ON public.game_players;
CREATE POLICY "Allow insert game_players" ON public.game_players FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update game_players" ON public.game_players;
CREATE POLICY "Allow update game_players" ON public.game_players FOR UPDATE USING (true);

GRANT SELECT, INSERT, UPDATE ON public.game_players TO anon, authenticated;

-- Realtime for arcade scoreboard
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'game_players'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.game_players;
    END IF;
  END IF;
END $$;

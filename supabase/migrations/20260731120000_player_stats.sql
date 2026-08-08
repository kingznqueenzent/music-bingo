-- Lightweight global player stats for LyricGrid leaderboard (wins + score).

CREATE TABLE IF NOT EXISTS public.player_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  games_played int NOT NULL DEFAULT 0 CHECK (games_played >= 0),
  wins int NOT NULL DEFAULT 0 CHECK (wins >= 0),
  score int NOT NULL DEFAULT 0 CHECK (score >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.player_stats IS 'Aggregate player stats keyed by display username (case-insensitive unique via RPC).';
COMMENT ON COLUMN public.player_stats.username IS 'Player display name; normalized to lowercase on write.';
COMMENT ON COLUMN public.player_stats.score IS 'Lifetime points earned (XP from games).';

CREATE INDEX IF NOT EXISTS idx_player_stats_wins_score
  ON public.player_stats (wins DESC, score DESC);

CREATE INDEX IF NOT EXISTS idx_player_stats_score
  ON public.player_stats (score DESC);

CREATE OR REPLACE FUNCTION public.increment_player_stats(
  p_username text,
  p_games int DEFAULT 0,
  p_wins int DEFAULT 0,
  p_score int DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  norm text := lower(btrim(p_username));
BEGIN
  IF norm = '' OR norm IS NULL THEN
    RETURN;
  END IF;

  p_games := GREATEST(COALESCE(p_games, 0), 0);
  p_wins := GREATEST(COALESCE(p_wins, 0), 0);
  p_score := GREATEST(COALESCE(p_score, 0), 0);

  UPDATE public.player_stats
  SET
    games_played = games_played + p_games,
    wins = wins + p_wins,
    score = score + p_score,
    updated_at = now()
  WHERE lower(username) = norm;

  IF NOT FOUND THEN
    INSERT INTO public.player_stats (username, games_played, wins, score, updated_at)
    VALUES (norm, p_games, p_wins, p_score, now());
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_player_stats(text, int, int, int) TO anon, authenticated;

ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read player_stats" ON public.player_stats;
CREATE POLICY "Allow read player_stats" ON public.player_stats FOR SELECT USING (true);

GRANT SELECT ON public.player_stats TO anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.player_stats';
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

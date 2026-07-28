-- B2B / monetization: venue branding, paid entry prize pool, game sponsors, premium players

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS venue_display_name text,
  ADD COLUMN IF NOT EXISTS brand_primary_hex text,
  ADD COLUMN IF NOT EXISTS brand_accent_hex text,
  ADD COLUMN IF NOT EXISTS brand_hide_lyricgrid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS entry_fee_cents int NOT NULL DEFAULT 0 CHECK (entry_fee_cents >= 0),
  ADD COLUMN IF NOT EXISTS prize_pool_cents int NOT NULL DEFAULT 0 CHECK (prize_pool_cents >= 0);

COMMENT ON COLUMN public.games.brand_hide_lyricgrid IS 'When true and white-label is on, hide LyricGrid branding on player/stage surfaces';
COMMENT ON COLUMN public.games.entry_fee_cents IS 'Per-player entry fee when paid_entry_games is enabled';

ALTER TABLE public.leaderboard
  ADD COLUMN IF NOT EXISTS premium_subscriber boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.game_sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo_url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_sponsors_game ON public.game_sponsors(game_id);

ALTER TABLE public.game_sponsors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read game_sponsors" ON public.game_sponsors;
CREATE POLICY "Allow read game_sponsors" ON public.game_sponsors FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert game_sponsors" ON public.game_sponsors;
CREATE POLICY "Allow insert game_sponsors" ON public.game_sponsors FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update game_sponsors" ON public.game_sponsors;
CREATE POLICY "Allow update game_sponsors" ON public.game_sponsors FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Allow delete game_sponsors" ON public.game_sponsors;
CREATE POLICY "Allow delete game_sponsors" ON public.game_sponsors FOR DELETE USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_sponsors TO anon, authenticated;

-- Atomic prize pool increment (paid joins)
CREATE OR REPLACE FUNCTION public.add_to_prize_pool(p_game_id uuid, p_cents int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_cents IS NULL OR p_cents <= 0 THEN
    RETURN;
  END IF;
  UPDATE public.games
  SET prize_pool_cents = COALESCE(prize_pool_cents, 0) + p_cents
  WHERE id = p_game_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_to_prize_pool(uuid, int) TO anon, authenticated;

INSERT INTO public.badge_definitions (id, name, description, icon_url, condition_type, condition_value) VALUES
  ('premium_patron', 'Premium Patron', 'LyricGrid Premium subscriber', NULL, 'games_played', 99999)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

NOTIFY pgrst, 'reload schema';

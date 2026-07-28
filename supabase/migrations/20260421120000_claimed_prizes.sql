-- Prize claims submitted by winners (host fulfillment / logistics)
-- Pair with Supabase Dashboard → Database → Webhooks: table public.claimed_prizes, event INSERT,
--   URL https://YOUR_DOMAIN/api/webhooks/claimed-prize
--   Header: X-Webhook-Secret: <same as CLAIMED_PRIZE_WEBHOOK_SECRET in Vercel/env>

CREATE TABLE IF NOT EXISTS public.prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  rank int NOT NULL CHECK (rank >= 1 AND rank <= 10),
  label text NOT NULL,
  image_url text,
  claim_url text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (game_id, rank)
);

CREATE INDEX IF NOT EXISTS idx_prizes_game ON public.prizes(game_id);

ALTER TABLE public.prizes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read prizes" ON public.prizes;
CREATE POLICY "Allow read prizes" ON public.prizes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert prizes" ON public.prizes;
CREATE POLICY "Allow insert prizes" ON public.prizes FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update prizes" ON public.prizes;
CREATE POLICY "Allow update prizes" ON public.prizes FOR UPDATE USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prizes TO anon, authenticated;

ALTER TABLE public.wins ADD COLUMN IF NOT EXISTS prize_id uuid REFERENCES public.prizes(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.claimed_prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winner_name text NOT NULL,
  prize_id uuid NOT NULL REFERENCES public.prizes(id) ON DELETE CASCADE,
  claim_email text NOT NULL,
  claim_phone text,
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claimed_prizes_game ON public.claimed_prizes(game_id);
CREATE INDEX IF NOT EXISTS idx_claimed_prizes_prize ON public.claimed_prizes(prize_id);

ALTER TABLE public.claimed_prizes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read claimed_prizes" ON public.claimed_prizes;
CREATE POLICY "Allow read claimed_prizes" ON public.claimed_prizes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert claimed_prizes" ON public.claimed_prizes;
CREATE POLICY "Allow insert claimed_prizes" ON public.claimed_prizes FOR INSERT WITH CHECK (true);

GRANT SELECT, INSERT ON public.claimed_prizes TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

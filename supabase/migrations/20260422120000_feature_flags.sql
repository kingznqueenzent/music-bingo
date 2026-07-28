-- Feature flags for LyricGrid (B2B, monetization, tournaments, XP, etc.)

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  label text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  description text NOT NULL DEFAULT ''
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read feature_flags" ON public.feature_flags;
CREATE POLICY "Allow read feature_flags" ON public.feature_flags FOR SELECT USING (true);

-- Mutations via service role (API routes) only
DROP POLICY IF EXISTS "Allow update feature_flags" ON public.feature_flags;
CREATE POLICY "Allow update feature_flags" ON public.feature_flags FOR UPDATE USING (false);

GRANT SELECT ON public.feature_flags TO anon, authenticated;

INSERT INTO public.feature_flags (key, label, enabled, description) VALUES
  ('b2b_white_label', 'White-label branding for venues', false, 'Custom logos and venue-facing branding on host and player UI.'),
  ('host_analytics', 'Host dashboard with game analytics', false, 'Analytics and insights on the host game dashboard.'),
  ('venue_packages', 'Venue booking and packages', false, 'Venue booking flows and package upsells.'),
  ('paid_entry_games', 'Paid entry games with prize pools', false, 'Monetized games and prize pool mechanics.'),
  ('sponsor_integration', 'Brand sponsor mystery envelopes', false, 'Sponsor integrations and mystery envelope features.'),
  ('premium_player_pass', 'Premium player subscriptions', false, 'Premium passes and subscription upsells for players.'),
  ('tournaments', 'Seasonal tournament system', false, 'Tournaments, registration, and tournament leaderboards.'),
  ('xp_and_badges', 'XP, streaks, and badge system', false, 'Player XP, streaks, levels, and badge rewards.')
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description;

NOTIFY pgrst, 'reload schema';

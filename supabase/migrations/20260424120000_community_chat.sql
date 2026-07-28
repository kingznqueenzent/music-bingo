-- Community chat: messages, game moderation, leaderboard chat stats, feature flag

INSERT INTO public.feature_flags (key, label, enabled, description) VALUES
  ('community_chat', 'Community chat', false, 'In-game, lobby, community hub, and tournament chat with moderation.')
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description;

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS muted_players text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS chat_profanity_filter_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.games.muted_players IS 'Lowercased emails or player identifiers blocked from chat';

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES public.games(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  player_email text NOT NULL DEFAULT '',
  player_identifier text,
  avatar_url text,
  message text NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('text', 'reaction', 'system')),
  room text NOT NULL CHECK (room IN ('lobby', 'ingame', 'community', 'tournament')),
  community_channel text CHECK (
    community_channel IS NULL OR community_channel IN ('general', 'dancehall', 'hiphop', '90s', 'throwbacks')
  ),
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE CASCADE,
  is_flagged boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_game_room_created
  ON public.chat_messages (game_id, room, created_at DESC)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_chat_messages_community
  ON public.chat_messages (room, community_channel, created_at DESC)
  WHERE is_deleted = false AND room = 'community';

CREATE INDEX IF NOT EXISTS idx_chat_messages_tournament
  ON public.chat_messages (tournament_id, created_at DESC)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_chat_messages_flagged
  ON public.chat_messages (game_id, is_flagged)
  WHERE is_flagged = true AND is_deleted = false;

ALTER TABLE public.leaderboard
  ADD COLUMN IF NOT EXISTS chat_messages_sent int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chat_distinct_days int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_chat_date date;

ALTER TABLE public.badge_definitions DROP CONSTRAINT IF EXISTS badge_definitions_condition_type_check;
ALTER TABLE public.badge_definitions ADD CONSTRAINT badge_definitions_condition_type_check
  CHECK (condition_type IN (
    'games_played', 'wins', 'streak', 'level', 'tournaments_entered',
    'chat_messages_sent', 'chat_distinct_days'
  ));

INSERT INTO public.badge_definitions (id, name, description, icon_url, condition_type, condition_value) VALUES
  ('chatterbox', 'Chatterbox', 'Send 50 chat messages', NULL, 'chat_messages_sent', 50),
  ('community_pillar', 'Community Pillar', '30 distinct days of chat activity', NULL, 'chat_distinct_days', 30)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  condition_type = EXCLUDED.condition_type,
  condition_value = EXCLUDED.condition_value;

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_messages service" ON public.chat_messages;
-- Access only via API (service role); block direct anon access
CREATE POLICY "chat_messages deny anon" ON public.chat_messages FOR ALL USING (false);

GRANT ALL ON public.chat_messages TO service_role;
-- PostgREST may use anon for some clients — table not exposed to anon for mutations if no grant
REVOKE ALL ON public.chat_messages FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';

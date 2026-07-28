-- Realtime host alerts: bingo wins, prize claims (Base44 notifyHostWin / notifyHostPrize).
CREATE TABLE IF NOT EXISTS public.game_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT game_events_type_check CHECK (
    event_type IN ('bingo_win', 'prize_claim', 'board_update')
  )
);

CREATE INDEX IF NOT EXISTS idx_game_events_game_created ON public.game_events (game_id, created_at DESC);

ALTER TABLE public.game_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "game_events_select" ON public.game_events;
CREATE POLICY "game_events_select" ON public.game_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "game_events_insert" ON public.game_events;
CREATE POLICY "game_events_insert" ON public.game_events FOR INSERT WITH CHECK (true);

GRANT SELECT, INSERT ON public.game_events TO anon, authenticated;
GRANT ALL ON public.game_events TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.game_events';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

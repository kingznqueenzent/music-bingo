-- Allow pending bingo claims so hosts can see CALL BINGO! even if realtime broadcast is missed.
-- Idempotent: safe to re-run.

ALTER TABLE public.game_events DROP CONSTRAINT IF EXISTS game_events_type_check;

ALTER TABLE public.game_events
  ADD CONSTRAINT game_events_type_check CHECK (
    event_type IN ('bingo_win', 'prize_claim', 'board_update', 'bingo_claim')
  );

NOTIFY pgrst, 'reload schema';

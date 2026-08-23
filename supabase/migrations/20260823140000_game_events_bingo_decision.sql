-- Host approve / reject of CALL BINGO claims (idempotent).
-- Extends game_events CHECK for bingo_approved + bingo_rejected.

ALTER TABLE public.game_events DROP CONSTRAINT IF EXISTS game_events_type_check;

ALTER TABLE public.game_events
  ADD CONSTRAINT game_events_type_check CHECK (
    event_type IN (
      'bingo_win',
      'prize_claim',
      'board_update',
      'bingo_claim',
      'bingo_approved',
      'bingo_rejected'
    )
  );

NOTIFY pgrst, 'reload schema';

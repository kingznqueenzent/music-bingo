-- Allow clients to receive chat via Realtime postgres_changes (RLS + GRANT SELECT).
-- API routes continue to use the service role for inserts/updates.

DROP POLICY IF EXISTS "chat_messages deny anon" ON public.chat_messages;

CREATE POLICY "chat_messages_select_visible"
  ON public.chat_messages FOR SELECT
  TO anon, authenticated
  USING (NOT is_deleted);

GRANT SELECT ON public.chat_messages TO anon, authenticated;

-- Replication for Realtime (no-op if already added)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages';
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

-- Private Realtime channels: authorize topics prefixed chat: (used by ChatPanel)
DO $rl$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'realtime' AND table_name = 'messages'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "chat_channels_private_join" ON realtime.messages';
    EXECUTE $p$
      CREATE POLICY "chat_channels_private_join"
      ON realtime.messages FOR SELECT
      TO anon, authenticated
      USING ((SELECT realtime.topic()) LIKE 'chat:%')
    $p$;
  END IF;
END
$rl$;

NOTIFY pgrst, 'reload schema';

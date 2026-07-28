-- DJ / host messages in chat
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS sender_role text NOT NULL DEFAULT 'player';

ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_sender_role_check;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_sender_role_check
  CHECK (sender_role IN ('player', 'host'));

COMMENT ON COLUMN public.chat_messages.sender_role IS 'host when sent with admin session; shown as DJ in UI';

NOTIFY pgrst, 'reload schema';
